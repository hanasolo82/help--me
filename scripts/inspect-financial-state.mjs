import { resolve } from 'node:path'
import {
  FINANCIAL_INSPECT_ARTIFACT,
  FINANCIAL_SMOKE_ARTIFACT,
  admin,
  formatIso,
  formatMoney,
  getAuditEventsByPaymentId,
  getAuditEventsByTaskId,
  getConnectAccountByProfileId,
  getLedgerEntriesByPaymentId,
  getPaymentById,
  getPaymentByTaskId,
  getTaskById,
  getTransferByPaymentId,
  getWebhookEventsByCorrelationId,
  readJsonFileIfExists,
  stripe,
  writeJsonFile,
} from './lib/financial-ops.mjs'

function parseArgs(argv) {
  const args = {
    paymentId: null,
    taskId: null,
    transferId: null,
    stripeEventId: null,
    artifactPath: FINANCIAL_SMOKE_ARTIFACT,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index]
    const next = argv[index + 1]

    if (current === '--payment-id') {
      args.paymentId = next || null
      index += 1
      continue
    }

    if (current === '--task-id') {
      args.taskId = next || null
      index += 1
      continue
    }

    if (current === '--transfer-id') {
      args.transferId = next || null
      index += 1
      continue
    }

    if (current === '--stripe-event-id') {
      args.stripeEventId = next || null
      index += 1
      continue
    }

    if (current === '--artifact') {
      args.artifactPath = next ? resolve(next) : args.artifactPath
      index += 1
      continue
    }
  }

  return args
}

async function resolveContext(args) {
  const artifact = await readJsonFileIfExists(args.artifactPath)
  let paymentId = args.paymentId || artifact?.context?.payment_id || null
  let taskId = args.taskId || artifact?.context?.task_id || null
  let transferId = args.transferId || artifact?.context?.transfer_id || null
  const stripeEventId = args.stripeEventId || artifact?.events?.at?.(-1)?.event_id || null

  if (!paymentId && taskId) {
    const byTask = await getPaymentByTaskId(taskId)
    paymentId = byTask?.id || null
  }

  if (!paymentId && transferId) {
    const { data, error } = await admin.from('transfers').select('payment_id').eq('stripe_transfer_id', transferId).maybeSingle()
    if (error) throw error
    paymentId = data?.payment_id || null
  }

  return {
    artifact,
    paymentId,
    taskId,
    transferId,
    stripeEventId,
  }
}

function printSection(title, lines) {
  console.log(`\n## ${title}`)
  for (const line of lines) {
    console.log(`- ${line}`)
  }
}

async function buildSummary({ payment, task, transfer, ledgerEntries, auditEvents, webhookEvents, connectAccount }) {
  const summary = {
    payment,
    task,
    transfer,
    ledger_entries: ledgerEntries,
    audit_events: auditEvents,
    webhook_events: webhookEvents,
    connect_account: connectAccount,
    totals: {
      ledger_entries: ledgerEntries.length,
      audit_events: auditEvents.length,
      webhook_events: webhookEvents.length,
    },
  }

  if (payment?.stripe_payment_intent_id) {
    summary.stripe_payment_intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    })
  }

  if (payment?.stripe_checkout_session_id) {
    summary.stripe_checkout_session = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id, {
      expand: ['payment_intent'],
    })
  }

  if (payment?.stripe_transfer_id) {
    summary.stripe_transfer = await stripe.transfers.retrieve(payment.stripe_transfer_id)
  }

  return summary
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const context = await resolveContext(args)

  if (!context.paymentId) {
    throw new Error('No payment could be resolved. Pass --payment-id or run the smoke first.')
  }

  const payment = await getPaymentById(context.paymentId)
  if (!payment) {
    throw new Error(`Payment ${context.paymentId} was not found.`)
  }

  const task = context.taskId ? await getTaskById(context.taskId) : await getTaskById(payment.task_id)
  const transfer = context.transferId ? await admin.from('transfers').select('*').eq('stripe_transfer_id', context.transferId).maybeSingle().then(({ data, error }) => {
    if (error) throw error
    return data
  }) : await getTransferByPaymentId(payment.id)

  const ledgerEntries = await getLedgerEntriesByPaymentId(payment.id)
  const auditEvents = [
    ...(await getAuditEventsByPaymentId(payment.id)),
    ...(task?.id ? await getAuditEventsByTaskId(task.id) : []),
  ]
  const webhookEvents = payment.correlation_id
    ? await getWebhookEventsByCorrelationId(payment.correlation_id)
    : []
  const connectAccount = payment.helper_profile_id
    ? await getConnectAccountByProfileId(payment.helper_profile_id)
    : null

  const summary = await buildSummary({
    payment,
    task,
    transfer,
    ledgerEntries,
    auditEvents,
    webhookEvents,
    connectAccount,
  })

  await writeJsonFile(FINANCIAL_INSPECT_ARTIFACT, {
    ok: true,
    inspected_at: new Date().toISOString(),
    payment_id: payment.id,
    task_id: task?.id || null,
    transfer_id: transfer?.id || null,
    summary,
  })

  printSection('Payment', [
    `id=${payment.id}`,
    `status=${payment.status}`,
    `amount=${formatMoney(payment.amount_cents, payment.currency)}`,
    `reconciliation=${payment.reconciliation_status || 'n/a'}`,
    `correlation_id=${payment.correlation_id || 'n/a'}`,
  ])

  if (task) {
    printSection('Task', [
      `id=${task.id}`,
      `status=${task.status}`,
      `created_by=${task.created_by}`,
      `accepted_by=${task.accepted_by}`,
      `completed_at=${formatIso(task.completed_at)}`,
    ])
  }

  if (transfer) {
    printSection('Transfer', [
      `id=${transfer.id}`,
      `status=${transfer.status}`,
      `stripe_transfer_id=${transfer.stripe_transfer_id || 'n/a'}`,
      `amount_cents=${transfer.amount_cents || 0}`,
    ])
  }

  if (connectAccount) {
    printSection('Connect', [
      `profile_id=${connectAccount.profile_id}`,
      `stripe_account_id=${connectAccount.stripe_account_id}`,
      `charges_enabled=${connectAccount.charges_enabled}`,
      `payouts_enabled=${connectAccount.payouts_enabled}`,
      `details_submitted=${connectAccount.details_submitted}`,
    ])
  }

  printSection('Totals', [
    `ledger_entries=${ledgerEntries.length}`,
    `audit_events=${auditEvents.length}`,
    `webhook_events=${webhookEvents.length}`,
  ])

  console.log('\nInspection artifact written to tmp/financial-inspection-result.json')
}

main().catch((error) => {
  const failure = {
    ok: false,
    inspected_at: new Date().toISOString(),
    error: error?.message || String(error),
  }

  writeJsonFile(FINANCIAL_INSPECT_ARTIFACT, failure).catch(() => null)
  console.error(failure.error)
  process.exitCode = 1
})
