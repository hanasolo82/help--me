import { resolve } from 'node:path'
import { admin, stripe, writeJsonFile } from './lib/financial-ops.mjs'
import {
  finalizeReleaseFromStripeTransfer,
  processPaymentReleaseJobs,
} from '../server/services/payment-release-jobs.service.js'

// Operator tool to recover a confirmed task whose payment never reached the helper.
//
// Why it exists: the durable queue added in 0061 only enqueues tasks completed from
// that point on. A payment left `held` by the old non-atomic flow (or a job that ran
// out of attempts and went `dead_letter`) has nothing watching it, so a helper can
// stay unpaid on a closed job — the exact situation that turns into a dispute.
//
// SCOPE (hard limits):
// - This script NEVER calls Stripe to move money itself. It only puts the payment back
//   into `payment_release_jobs` and asks the production worker to run it, so every
//   transfer goes through the same idempotent, validated path as normal traffic.
// - Eligible: task `completed` + payment in `held`/`release_pending`/`transferring`
//   AND (no job at all OR job in `dead_letter`). Anything the worker is already
//   handling (`queued`/`retry_wait`/`processing`) is reported and left alone.
// - Default mode is a dry run that only reports. Applying needs `--apply` plus an
//   explicit target: `--payment=<id>` or `--all`.
//
//   pnpm run repair:payment-release
//   pnpm run repair:payment-release -- --apply --payment=<payment_id>
//   pnpm run repair:payment-release -- --apply --all

const DEFAULT_ARTIFACT = resolve(process.cwd(), 'tmp/payment-release-requeue.json')
const RELEASABLE_PAYMENT_STATUSES = ['held', 'release_pending', 'transferring']
const WORKER_OWNED_JOB_STATUSES = new Set(['queued', 'retry_wait', 'processing'])

function parseArgs(argv) {
  const args = { apply: false, all: false, paymentId: null, artifactPath: DEFAULT_ARTIFACT }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const [flag, inlineValue] = current.split('=', 2)
    const next = argv[index + 1]

    if (flag === '--apply') {
      args.apply = true
      continue
    }

    if (flag === '--dry-run') {
      args.apply = false
      continue
    }

    if (flag === '--all') {
      args.all = true
      continue
    }

    if (flag === '--payment' || flag === '--artifact') {
      const value = inlineValue ?? next
      if (!value) throw new Error(`${flag} requires a value.`)
      if (inlineValue === undefined) index += 1

      if (flag === '--payment') args.paymentId = value
      if (flag === '--artifact') args.artifactPath = resolve(value)
      continue
    }

    throw new Error(`Unknown argument: ${current}`)
  }

  if (args.apply && !args.all && !args.paymentId) {
    throw new Error('--apply requires --payment=<payment_id> or --all.')
  }

  return args
}

async function loadCandidates() {
  const { data: payments, error } = await admin
    .from('payments')
    .select('id, task_id, status, reconciliation_status, helper_amount_cents, helper_profile_id, stripe_charge_id, tasks(status, created_by)')
    .in('status', RELEASABLE_PAYMENT_STATUSES)
  if (error) throw error

  const stuck = (payments || []).filter((payment) => payment.tasks?.status === 'completed')
  if (stuck.length === 0) return []

  const { data: jobs, error: jobsError } = await admin
    .from('payment_release_jobs')
    .select('id, payment_id, status, attempt_count, last_error_code, last_error, next_attempt_at')
    .in('payment_id', stuck.map((payment) => payment.id))
  if (jobsError) throw jobsError

  const jobByPayment = new Map((jobs || []).map((job) => [job.payment_id, job]))
  return stuck.map((payment) => ({ payment, job: jobByPayment.get(payment.id) || null }))
}

// Same readiness rules the worker enforces, checked up front so a dry run tells the
// operator whether requeueing will actually pay the helper or just fail again.
//
// The `action` matters more than anything else here. A payment that already has a local
// transfer row means the money HAS left towards the connected account: the worker will
// retrieve that transfer and only finalize local state (service:292-308). Without that
// row it creates a new transfer, so a payment sitting in `transferring` with no local
// row is never auto-eligible — it could mean an orphan transfer in Stripe and paying
// twice. That case is handed to a human instead.
async function diagnose({ payment, job }) {
  const { data: account, error } = await admin
    .from('connect_accounts')
    .select('stripe_account_id, charges_enabled, payouts_enabled, details_submitted')
    .eq('profile_id', payment.helper_profile_id)
    .maybeSingle()
  if (error) throw error

  const connectReady = Boolean(
    account?.stripe_account_id
    && account.charges_enabled
    && account.payouts_enabled
    && account.details_submitted,
  )

  const { data: transferRow, error: transferError } = await admin
    .from('transfers')
    .select('id, status, stripe_transfer_id')
    .eq('payment_id', payment.id)
    .maybeSingle()
  if (transferError) throw transferError

  // No local row does NOT prove Stripe never sent the money: a run that died between
  // `transfers.create` and the local finalizer leaves an orphan transfer, and creating a
  // second one would pay the helper twice. Always ask Stripe before deciding.
  const orphan = transferRow?.stripe_transfer_id ? null : await findOrphanTransfer(payment)

  const action = transferRow?.stripe_transfer_id
    ? 'finalize_existing_transfer'
    : orphan
      ? 'finalize_orphan_transfer'
      : 'create_transfer'

  const blockers = []
  if (!connectReady) blockers.push('helper_connect_not_ready')
  if (job?.status === 'succeeded') blockers.push('job_already_succeeded')

  let transfer = orphan
    ? { id: orphan.id, amount: orphan.amount, reversed: orphan.reversed, exists: true, orphan: true }
    : null
  if (orphan?.reversed) blockers.push('transfer_reversed')

  if (action === 'finalize_existing_transfer') {
    try {
      const remote = await stripe.transfers.retrieve(transferRow.stripe_transfer_id)
      transfer = { id: remote.id, amount: remote.amount, reversed: remote.reversed, exists: true }
      if (remote.reversed) blockers.push('transfer_reversed')
    } catch (stripeError) {
      transfer = { id: transferRow.stripe_transfer_id, exists: false }
      blockers.push('local_transfer_missing_in_stripe')
    }
  } else if (action === 'create_transfer' && payment.status !== 'held') {
    // `transferring`/`release_pending`, no local row and nothing in Stripe: do not guess.
    blockers.push('in_flight_without_local_transfer')
  }

  let charge = null
  if (action === 'create_transfer') {
    charge = { present: false }
    if (payment.stripe_charge_id) {
      try {
        const remote = await stripe.charges.retrieve(payment.stripe_charge_id)
        charge = {
          present: true,
          refunded: remote.refunded,
          disputed: remote.disputed,
          covers_helper_amount: remote.amount >= payment.helper_amount_cents,
        }
      } catch (stripeError) {
        charge = { present: false, error: stripeError?.code || stripeError?.message || 'charge_lookup_failed' }
      }
    }

    if (!charge.present) blockers.push('missing_stripe_charge')
    if (charge.refunded) blockers.push('charge_refunded')
    if (charge.disputed) blockers.push('charge_disputed')
    if (charge.present && charge.covers_helper_amount === false) blockers.push('charge_below_helper_amount')
  }

  const workerOwned = Boolean(job && WORKER_OWNED_JOB_STATUSES.has(job.status))

  return {
    payment_id: payment.id,
    task_id: payment.task_id,
    helper_amount_cents: payment.helper_amount_cents,
    payment_status: payment.status,
    reconciliation_status: payment.reconciliation_status,
    job: job ? { id: job.id, status: job.status, attempts: job.attempt_count, last_error_code: job.last_error_code } : null,
    action,
    connect_ready: connectReady,
    charge,
    transfer,
    worker_owned: workerOwned,
    blockers,
    eligible: !workerOwned && blockers.length === 0,
  }
}

// The worker stamps transfer_group with the task id and payment_id in metadata, so this
// finds money that left the platform without ever being recorded locally.
async function findOrphanTransfer(payment) {
  try {
    const { data } = await stripe.transfers.list({
      transfer_group: payment.task_id || payment.id,
      limit: 10,
    })

    return data.find((transfer) => transfer.metadata?.payment_id === payment.id) || null
  } catch {
    return null
  }
}

async function requeue({ payment, job }) {
  // A dead-lettered job is out of attempts: hand it back to the worker as queued.
  // The idempotency key is left untouched so Stripe's own replay protection still applies.
  if (job?.status === 'dead_letter') {
    const { error } = await admin
      .from('payment_release_jobs')
      .update({ status: 'queued', next_attempt_at: new Date().toISOString(), processing_started_at: null })
      .eq('id', job.id)
      .eq('status', 'dead_letter')
    if (error) throw error
    return job.id
  }

  const { data, error } = await admin.rpc('queue_task_payment_release', {
    p_task_id: payment.task_id,
    p_requester_id: payment.tasks.created_by,
  })
  if (error) throw error

  const queued = Array.isArray(data) ? data[0] : data
  if (!queued?.job_id) {
    throw new Error(`queue_task_payment_release returned no job for payment ${payment.id}.`)
  }

  return queued.job_id
}

async function readOutcome(paymentId, taskId) {
  const [payment, task, transfers] = await Promise.all([
    admin.from('payments').select('status, reconciliation_status, reconciliation_error').eq('id', paymentId).maybeSingle(),
    admin.from('tasks').select('status').eq('id', taskId).maybeSingle(),
    admin.from('transfers').select('id, status, stripe_transfer_id').eq('payment_id', paymentId),
  ])

  return {
    payment_status: payment.data?.status || null,
    reconciliation_status: payment.data?.reconciliation_status || null,
    reconciliation_error: payment.data?.reconciliation_error || null,
    task_status: task.data?.status || null,
    transfers: transfers.data || [],
  }
}

function printReport(report) {
  console.log(report.mode === 'apply' ? 'Payment release requeue (APPLY)' : 'Payment release requeue (dry run)')
  console.log(`Candidates: ${report.candidates.length}`)

  for (const candidate of report.candidates) {
    const money = (candidate.helper_amount_cents / 100).toFixed(2)
    const state = candidate.eligible
      ? 'ELIGIBLE'
      : candidate.worker_owned
        ? `LEFT TO WORKER (${candidate.job?.status})`
        : `BLOCKED (${candidate.blockers.join(', ')})`
    const what = {
      finalize_existing_transfer: 'finalize transfer already sent',
      finalize_orphan_transfer: 'ORPHAN in Stripe, only record it locally',
      create_transfer: 'create transfer',
    }[candidate.action]
    console.log(`- ${candidate.payment_id} ${money} EUR · job=${candidate.job?.status || 'none'} · ${what} · ${state}`)
  }

  if (report.applied.length > 0) {
    console.log('\nApplied:')
    for (const entry of report.applied) {
      console.log(`- ${entry.payment_id}: ${entry.outcome} → payment=${entry.after.payment_status} task=${entry.after.task_status} transfers=${entry.after.transfers.length}`)
      if (entry.after.reconciliation_error) {
        console.log(`  error: ${entry.after.reconciliation_error}`)
      }
    }
  }

  if (report.mode === 'dry-run' && report.candidates.some((candidate) => candidate.eligible)) {
    console.log('\nNothing was changed. Re-run with --apply --payment=<id> (or --all) to requeue.')
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const candidates = await loadCandidates()
  const diagnosed = []

  for (const candidate of candidates) {
    diagnosed.push({ ...(await diagnose(candidate)), _raw: candidate })
  }

  const targets = args.apply
    ? diagnosed.filter((candidate) => candidate.eligible && (args.all || candidate.payment_id === args.paymentId))
    : []

  if (args.apply && args.paymentId && targets.length === 0) {
    const known = diagnosed.find((candidate) => candidate.payment_id === args.paymentId)
    throw new Error(
      known
        ? `Payment ${args.paymentId} is not eligible: ${known.worker_owned ? `worker owns it (${known.job?.status})` : known.blockers.join(', ')}.`
        : `Payment ${args.paymentId} is not a stuck release candidate.`,
    )
  }

  const applied = []
  for (const target of targets) {
    // Requeue first either way: finalizing needs the job row to exist.
    const jobId = await requeue(target._raw)
    let outcome = 'no_outcome'
    let errorCode = null

    if (target.action === 'finalize_orphan_transfer') {
      const transfer = await stripe.transfers.retrieve(target.transfer.id)
      const finalized = await finalizeReleaseFromStripeTransfer({ paymentId: target.payment_id, transfer })
      outcome = finalized ? 'finalized_existing_transfer' : 'finalize_returned_null'
    } else {
      const outcomes = await processPaymentReleaseJobs({ jobId, limit: 1 })
      outcome = outcomes?.[0]?.outcome || 'no_outcome'
      errorCode = outcomes?.[0]?.error_code || null
    }

    applied.push({
      payment_id: target.payment_id,
      job_id: jobId,
      outcome,
      error_code: errorCode,
      after: await readOutcome(target.payment_id, target.task_id),
    })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    candidates: diagnosed.map(({ _raw, ...candidate }) => candidate),
    applied,
  }

  await writeJsonFile(args.artifactPath, report)
  printReport(report)

  const failed = applied.filter((entry) => entry.after.payment_status !== 'released')
  if (failed.length > 0) {
    console.error(`\n${failed.length} payment(s) did not reach 'released'. Check the report: ${args.artifactPath}`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(`Payment release requeue failed: ${error?.message || error}`)
  process.exitCode = 1
})
