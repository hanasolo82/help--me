import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import {
  admin,
  formatIso,
  formatMoney,
  getLedgerEntriesByPaymentId,
  getPaymentById,
  getPaymentByTaskId,
  getTaskById,
  getTransferByPaymentId,
  stripe,
  writeJsonFile,
} from './lib/financial-ops.mjs'

// Supervised repair for the two historical payments stuck in `processing`.
//
// SCOPE (hard limits):
// - This script NEVER moves money. It does not create transfers, refunds or payouts.
// - The only mutation it can perform is reconciling the LOCAL payment row from
//   `processing` -> `held`, replicating exactly what `payment_intent.succeeded`
//   would have written had the checkout/payment_intent race not degraded it.
// - Money is only ever moved later through the existing idempotent release flow.
//
// Default mode is `--dry-run`. Applying requires THREE explicit flags together:
//   --apply --entity=<payment_id|task_id> --confirm=<plan hash from dry-run>
//
// See .agent-worklog/phase-3-block1-drift-investigation.md for the full diagnosis.

const MODE = 'reconcile-processing-to-held'

// Only these two critical drift cases are eligible. Anything else is rejected.
const REPAIR_TARGETS = [
  {
    task_id: '67762f8c-53a8-4f89-a744-43691d0b94ba',
    payment_id: '6692e7b7-7a7b-4062-86e9-6efbb3ca597e',
  },
  {
    task_id: '515bb723-c076-4c19-bfa3-d3f7df4cfc45',
    payment_id: '6bcd1622-70ef-4a04-93a2-27685e44ec89',
  },
]

const DEFAULT_ARTIFACT = resolve(process.cwd(), 'tmp/financial-repair-plan.json')

const REPAIR_CAUSE =
  'Interrupted checkout/payment_intent race left a captured payment in `processing`. ' +
  'Stripe confirms the charge succeeded, is not refunded/disputed and has no transfer; ' +
  'the local row is reconciled from `processing` to `held`. No money is moved.'

function parseArgs(argv) {
  const args = {
    apply: false,
    dryRun: true,
    entity: null,
    confirm: null,
    operator: defaultOperator(),
    artifactPath: DEFAULT_ARTIFACT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const [flag, inlineValue] = current.split('=', 2)
    const next = argv[index + 1]

    if (flag === '--apply') {
      args.apply = true
      args.dryRun = false
      continue
    }

    if (flag === '--dry-run') {
      args.dryRun = true
      args.apply = false
      continue
    }

    if (
      flag === '--entity' ||
      flag === '--confirm' ||
      flag === '--operator' ||
      flag === '--artifact'
    ) {
      const value = inlineValue ?? next
      if (!value) {
        throw new Error(`${flag} requires a value.`)
      }
      if (inlineValue === undefined) {
        index += 1
      }

      if (flag === '--entity') args.entity = value.trim()
      if (flag === '--confirm') args.confirm = value.trim()
      if (flag === '--operator') args.operator = value.trim()
      if (flag === '--artifact') args.artifactPath = resolve(value)
      continue
    }

    throw new Error(`Unknown argument: ${current}`)
  }

  return args
}

function defaultOperator() {
  return (
    process.env.REPAIR_OPERATOR?.trim() ||
    process.env.USERNAME?.trim() ||
    process.env.USER?.trim() ||
    'unknown'
  )
}

function resolveTarget(entity) {
  if (!entity) return null
  return (
    REPAIR_TARGETS.find(
      (target) => target.payment_id === entity || target.task_id === entity,
    ) || null
  )
}

// Deterministic, order-independent JSON so the same plan always hashes the same.
function canonical(value) {
  if (Array.isArray(value)) {
    return value.map(canonical)
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = canonical(value[key])
        return acc
      }, {})
  }
  return value
}

function hashPlanBasis(basis) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(basis)))
    .digest('hex')
}

function stripeChargeFromIntent(paymentIntent) {
  const charge = paymentIntent?.latest_charge
  if (charge && typeof charge === 'object') {
    return charge
  }
  return null
}

async function listStripeTransfersForPayment(target, payment) {
  const transferGroup = payment.task_id || payment.id
  if (!transferGroup) return []

  const matches = []
  const list = await stripe.transfers.list({
    transfer_group: transferGroup,
    limit: 100,
  })

  for (const transfer of list.data || []) {
    const metadataPaymentId = transfer?.metadata?.payment_id || null
    if (metadataPaymentId === payment.id || metadataPaymentId === target.payment_id) {
      matches.push({ id: transfer.id, amount: transfer.amount, reversed: transfer.reversed })
    }
  }

  return matches
}

// Gathers the authoritative Stripe + Supabase state and evaluates every precondition.
async function gatherState(target) {
  const payment = await getPaymentById(target.payment_id)
  if (!payment) {
    throw new Error(`Payment ${target.payment_id} not found in Supabase.`)
  }
  if (payment.task_id !== target.task_id) {
    throw new Error(
      `Payment ${target.payment_id} points to task ${payment.task_id}, expected ${target.task_id}.`,
    )
  }

  const task = await getTaskById(target.task_id)
  if (!task) {
    throw new Error(`Task ${target.task_id} not found in Supabase.`)
  }

  const localTransfer = await getTransferByPaymentId(payment.id)
  const ledgerEntries = await getLedgerEntriesByPaymentId(payment.id)
  const ledgerEntryTypes = ledgerEntries.map((entry) => entry.entry_type)
  const hasFundsHeld = ledgerEntryTypes.includes('funds_held')

  let paymentIntent = null
  let charge = null
  let stripeTransfers = []

  if (payment.stripe_payment_intent_id) {
    paymentIntent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
      expand: ['latest_charge', 'latest_charge.refunds'],
    })
    charge = stripeChargeFromIntent(paymentIntent)
  }

  stripeTransfers = await listStripeTransfersForPayment(target, payment)

  const chargeRefunded = Boolean(charge?.refunded) || Number(charge?.amount_refunded || 0) > 0
  const chargeDisputed = Boolean(charge?.disputed) || Boolean(charge?.dispute)
  const stripeTransferExists = stripeTransfers.length > 0 || Boolean(payment.stripe_transfer_id)

  const checks = [
    // Stripe preconditions
    {
      name: 'stripe_payment_intent_succeeded',
      ok: paymentIntent?.status === 'succeeded',
      detail: { status: paymentIntent?.status || null },
    },
    {
      name: 'stripe_charge_present',
      ok: Boolean(charge),
      detail: { charge_id: charge?.id || null },
    },
    {
      name: 'stripe_charge_not_refunded',
      ok: Boolean(charge) && !chargeRefunded,
      detail: {
        refunded: Boolean(charge?.refunded),
        amount_refunded: Number(charge?.amount_refunded || 0),
      },
    },
    {
      name: 'stripe_charge_no_dispute',
      ok: Boolean(charge) && !chargeDisputed,
      detail: { disputed: Boolean(charge?.disputed), dispute: charge?.dispute || null },
    },
    {
      name: 'stripe_no_existing_transfer',
      ok: !stripeTransferExists,
      detail: {
        stripe_transfers: stripeTransfers,
        local_stripe_transfer_id: payment.stripe_transfer_id || null,
      },
    },
    // Supabase preconditions
    {
      name: 'supabase_task_completed',
      ok: task.status === 'completed',
      detail: { task_status: task.status },
    },
    {
      name: 'supabase_payment_processing',
      ok: payment.status === 'processing',
      detail: { payment_status: payment.status },
    },
    {
      name: 'supabase_ledger_has_funds_held',
      ok: hasFundsHeld,
      detail: { ledger_entry_types: ledgerEntryTypes },
    },
    {
      name: 'supabase_no_local_transfer',
      ok: !localTransfer,
      detail: { local_transfer_id: localTransfer?.id || null },
    },
  ]

  const failures = checks.filter((check) => !check.ok).map((check) => check.name)

  return {
    payment,
    task,
    localTransfer,
    ledgerEntries,
    paymentIntent,
    charge,
    stripeTransfers,
    checks,
    failures,
    repairable: failures.length === 0,
  }
}

function buildPlan(target, state, operatorNote) {
  const { payment, task, charge, paymentIntent } = state

  const before = {
    payment_status: payment.status,
    held_at: payment.held_at || null,
    reconciliation_status: payment.reconciliation_status || null,
    reconciliation_error: payment.reconciliation_error || null,
    updated_at: payment.updated_at || null,
  }

  // After state mirrors handlePaymentIntentSucceeded's post-capture write.
  const after = {
    payment_status: 'held',
    held_at: payment.held_at || 'now()',
    reconciliation_status: 'reconciled',
    reconciliation_error: null,
  }

  // The hash basis intentionally INCLUDES the volatile `updated_at` and the live
  // Stripe snapshot. If anything drifts between dry-run and apply, the recomputed
  // hash will not match the supplied --confirm and the apply aborts.
  const planBasis = {
    mode: MODE,
    entity: { payment_id: payment.id, task_id: task.id },
    expected_updated_at: payment.updated_at || null,
    before,
    after: { ...after, held_at: payment.held_at || '__now__' },
    stripe: {
      payment_intent_id: paymentIntent?.id || null,
      payment_intent_status: paymentIntent?.status || null,
      charge_id: charge?.id || null,
      charge_refunded: Boolean(charge?.refunded),
      charge_amount_refunded: Number(charge?.amount_refunded || 0),
      charge_disputed: Boolean(charge?.disputed),
      transfer_count: state.stripeTransfers.length,
    },
  }

  const planHash = hashPlanBasis(planBasis)

  return {
    mode: MODE,
    entity: { payment_id: payment.id, task_id: task.id },
    repairable: state.repairable,
    failures: state.failures,
    amount: formatMoney(payment.amount_cents, payment.currency),
    expected_guard: {
      id: payment.id,
      status: 'processing',
      updated_at: payment.updated_at || null,
      stripe_transfer_id_is_null: true,
    },
    before,
    after,
    cause: REPAIR_CAUSE,
    operator_note: operatorNote || null,
    stripe_snapshot: planBasis.stripe,
    supabase_snapshot: {
      task_status: task.status,
      payment_status: payment.status,
      ledger_entry_types: state.ledgerEntries.map((entry) => entry.entry_type),
      local_transfer_id: state.localTransfer?.id || null,
    },
    preconditions: state.checks,
    plan_hash: planHash,
    apply_command: `pnpm run repair:financial-drift -- --apply --entity=${payment.id} --confirm=${planHash}`,
  }
}

// Optimistic-locked, money-safe update. Matches by id + previous status +
// expected updated_at + absence of transfer. 0 rows updated => state drifted => abort.
async function applyGuardedRepair(plan) {
  const { payment_id: id } = plan.entity
  const nowIso = new Date().toISOString()

  const { data, error } = await admin
    .from('payments')
    .update({
      status: 'held',
      held_at: plan.before.held_at || nowIso,
      reconciliation_status: 'reconciled',
      reconciliation_error: null,
      last_reconciled_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', id)
    .eq('status', 'processing')
    .eq('updated_at', plan.expected_guard.updated_at)
    .is('stripe_transfer_id', null)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

async function createRepairAudit({ plan, payment, before, after, operator, artifactPath }) {
  const appliedAt = new Date().toISOString()

  const { data, error } = await admin
    .from('audit_events')
    .insert({
      event_type: 'financial_drift_repair',
      severity: 'warning',
      actor_type: 'admin',
      actor_profile_id: null,
      entity_type: 'payment',
      entity_id: String(payment.id),
      before_state: before,
      after_state: after,
      correlation_id: payment.correlation_id || null,
      stripe_event_id: null,
      metadata: {
        mode: MODE,
        cause: REPAIR_CAUSE,
        task_id: payment.task_id,
        operator,
        applied_at: appliedAt,
        plan_hash: plan.plan_hash,
        dry_run_artifact: artifactPath,
        stripe_snapshot: plan.stripe_snapshot,
        supabase_snapshot: plan.supabase_snapshot,
        money_moved: false,
      },
    })
    .select('*')
    .single()

  if (error) throw error
  return { audit: data, appliedAt }
}

function printPlan(plan) {
  console.log(`\n=== Plan: ${plan.entity.payment_id} (task ${plan.entity.task_id}) ===`)
  console.log(`Amount: ${plan.amount}`)
  console.log(`Repairable: ${plan.repairable ? 'YES' : 'NO'}`)
  if (!plan.repairable) {
    console.log(`Failed preconditions: ${plan.failures.join(', ')}`)
  }
  console.log('Before:', JSON.stringify(plan.before))
  console.log('After :', JSON.stringify(plan.after))
  console.log('Preconditions:')
  for (const check of plan.preconditions) {
    console.log(`  [${check.ok ? 'OK ' : 'XX '}] ${check.name} ${JSON.stringify(check.detail)}`)
  }
  console.log(`Plan hash: ${plan.plan_hash}`)
  if (plan.repairable) {
    console.log(`Apply with:\n  ${plan.apply_command}`)
  }
}

async function runDryRun(args) {
  const targets = args.entity
    ? [resolveTarget(args.entity)].filter(Boolean)
    : REPAIR_TARGETS

  if (args.entity && targets.length === 0) {
    throw new Error(
      `Entity ${args.entity} is not one of the two eligible critical repair targets.`,
    )
  }

  const plans = []
  for (const target of targets) {
    const state = await gatherState(target)
    plans.push(buildPlan(target, state, args.operator ? `operator=${args.operator}` : null))
  }

  const report = {
    mode: MODE,
    generatedAt: new Date().toISOString(),
    dry_run: true,
    operator: args.operator,
    cause: REPAIR_CAUSE,
    plans,
  }

  await writeJsonFile(args.artifactPath, report)

  console.log('Financial drift repair — DRY RUN (no writes performed)')
  console.log(`Artifact: ${args.artifactPath}`)
  for (const plan of plans) {
    printPlan(plan)
  }

  const blocked = plans.filter((plan) => !plan.repairable)
  console.log(
    `\n${plans.length} plan(s) generated; ${plans.length - blocked.length} repairable, ${blocked.length} blocked.`,
  )
  console.log(
    'No money was moved. To apply, re-run with --apply --entity=<id> --confirm=<plan hash>.',
  )
}

async function runApply(args) {
  if (!args.entity) {
    throw new Error('--apply requires --entity=<payment_id|task_id>.')
  }
  if (!args.confirm) {
    throw new Error('--apply requires --confirm=<plan hash from dry-run>.')
  }

  const target = resolveTarget(args.entity)
  if (!target) {
    throw new Error(
      `Entity ${args.entity} is not one of the two eligible critical repair targets.`,
    )
  }

  // Re-read everything immediately before applying.
  const state = await gatherState(target)
  const plan = buildPlan(target, state, `operator=${args.operator}`)

  if (!state.repairable) {
    throw new Error(
      `Preconditions failed; refusing to apply. Failed: ${state.failures.join(', ')}`,
    )
  }

  if (plan.plan_hash !== args.confirm) {
    throw new Error(
      `Confirm hash mismatch. State drifted since the dry-run, or the hash is wrong.\n` +
        `  expected: ${plan.plan_hash}\n  provided: ${args.confirm}\nAborting without writes.`,
    )
  }

  const before = plan.before
  const updated = await applyGuardedRepair(plan)

  if (!updated) {
    throw new Error(
      'Guarded update affected 0 rows. The payment changed (status/updated_at/transfer) ' +
        'since the plan was built. Aborted without changes.',
    )
  }

  const after = {
    payment_status: updated.status,
    held_at: updated.held_at || null,
    reconciliation_status: updated.reconciliation_status || null,
    reconciliation_error: updated.reconciliation_error || null,
    updated_at: updated.updated_at || null,
  }

  const { audit, appliedAt } = await createRepairAudit({
    plan,
    payment: updated,
    before,
    after,
    operator: args.operator,
    artifactPath: args.artifactPath,
  })

  const report = {
    mode: MODE,
    generatedAt: appliedAt,
    dry_run: false,
    applied: true,
    operator: args.operator,
    confirm_hash: args.confirm,
    entity: plan.entity,
    cause: REPAIR_CAUSE,
    before,
    after,
    audit_event_id: audit.id,
    money_moved: false,
  }

  await writeJsonFile(args.artifactPath, report)

  console.log('Financial drift repair — APPLIED')
  console.log(`Entity: payment ${plan.entity.payment_id} (task ${plan.entity.task_id})`)
  console.log('Before:', JSON.stringify(before))
  console.log('After :', JSON.stringify(after))
  console.log(`Audit event: ${audit.id}`)
  console.log(`Artifact: ${args.artifactPath}`)
  console.log('No money was moved. Release remains gated by the existing idempotent flow.')
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.apply) {
    await runApply(args)
  } else {
    await runDryRun(args)
  }
}

main().catch(async (error) => {
  const message = error?.message || String(error)
  console.error(`Financial drift repair failed: ${message}`)
  process.exitCode = 1
})
