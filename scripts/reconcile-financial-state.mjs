import { resolve } from 'node:path'
import {
  FINANCIAL_RECONCILE_ARTIFACT,
  FINANCIAL_SMOKE_ARTIFACT,
  admin,
  getPaymentById,
  getPaymentByTaskId,
  readJsonFileIfExists,
  stripe,
  writeJsonFile,
} from './lib/financial-ops.mjs'

function parseArgs(argv) {
  const args = {
    paymentId: null,
    taskId: null,
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

    if (current === '--artifact') {
      args.artifactPath = next ? resolve(next) : args.artifactPath
      index += 1
      continue
    }
  }

  return args
}

async function resolvePaymentId(args) {
  if (args.paymentId) return args.paymentId

  const artifact = await readJsonFileIfExists(args.artifactPath)
  if (artifact?.context?.payment_id) return artifact.context.payment_id

  if (args.taskId) {
    const payment = await getPaymentByTaskId(args.taskId)
    return payment?.id || null
  }

  return null
}

function addFinding(collection, level, code, message, details = {}) {
  collection.push({
    level,
    code,
    message,
    details,
  })
}

function classifyStatus(findings) {
  if (findings.some((finding) => finding.level === 'critical')) {
    return 'mismatch'
  }

  if (findings.some((finding) => finding.level === 'warning')) {
    return 'needs_review'
  }

  return 'reconciled'
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const paymentId = await resolvePaymentId(args)

  if (!paymentId) {
    throw new Error('No payment id could be resolved. Pass --payment-id or run the smoke first.')
  }

  const payment = await getPaymentById(paymentId)
  if (!payment) {
    throw new Error(`Payment ${paymentId} was not found.`)
  }

  const findings = []
  const matches = []
  const remote = {}

  if (payment.stripe_checkout_session_id) {
    remote.checkout_session = await stripe.checkout.sessions.retrieve(payment.stripe_checkout_session_id, {
      expand: ['payment_intent'],
    })

    if (remote.checkout_session.id !== payment.stripe_checkout_session_id) {
      addFinding(findings, 'critical', 'checkout_session_id_mismatch', 'Checkout session id does not match the local payment row.', {
        local: payment.stripe_checkout_session_id,
        remote: remote.checkout_session.id,
      })
    } else {
      matches.push('checkout_session_id')
    }

    const remotePaymentIntentId = typeof remote.checkout_session.payment_intent === 'string'
      ? remote.checkout_session.payment_intent
      : remote.checkout_session.payment_intent?.id || null

    if (remotePaymentIntentId && remotePaymentIntentId !== payment.stripe_payment_intent_id) {
      addFinding(findings, 'critical', 'payment_intent_id_mismatch', 'Checkout session payment intent does not match the local payment row.', {
        local: payment.stripe_payment_intent_id,
        remote: remotePaymentIntentId,
      })
    } else if (remotePaymentIntentId) {
      matches.push('payment_intent_id')
    }
  }

  if (payment.stripe_payment_intent_id) {
    remote.payment_intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
      expand: ['latest_charge'],
    })

    if (remote.payment_intent.id !== payment.stripe_payment_intent_id) {
      addFinding(findings, 'critical', 'payment_intent_fetch_mismatch', 'Payment intent could not be reloaded from Stripe.', {
        local: payment.stripe_payment_intent_id,
        remote: remote.payment_intent?.id || null,
      })
    } else {
      matches.push('payment_intent_loaded')
    }

    if (remote.payment_intent.status === 'succeeded') {
      if (!['held', 'release_pending', 'transferring', 'released'].includes(payment.status)) {
        addFinding(findings, 'warning', 'payment_status_after_capture', 'Stripe says the payment succeeded, but the local row is not in a post-capture state.', {
          local: payment.status,
          remote: remote.payment_intent.status,
        })
      } else {
        matches.push('capture_state')
      }
    }
  }

  if (payment.stripe_transfer_id) {
    remote.transfer = await stripe.transfers.retrieve(payment.stripe_transfer_id)

    if (remote.transfer.id !== payment.stripe_transfer_id) {
      addFinding(findings, 'critical', 'transfer_id_mismatch', 'Transfer could not be reloaded from Stripe.', {
        local: payment.stripe_transfer_id,
        remote: remote.transfer?.id || null,
      })
    } else {
      matches.push('transfer_loaded')
    }

    if (remote.transfer.status === 'paid' && payment.status !== 'released') {
      addFinding(findings, 'critical', 'release_state_mismatch', 'Stripe says the transfer is paid, but the local payment is not released.', {
        local: payment.status,
        remote: remote.transfer.status,
      })
    }

    if (remote.transfer.status === 'pending' && payment.status !== 'transferring') {
      addFinding(findings, 'warning', 'transfer_pending_mismatch', 'Stripe says the transfer is pending, but the local payment is not transferring.', {
        local: payment.status,
        remote: remote.transfer.status,
      })
    }

    if (remote.transfer.status === 'failed' && payment.status !== 'held') {
      addFinding(findings, 'warning', 'transfer_failed_mismatch', 'Stripe says the transfer failed, but the local payment did not return to held.', {
        local: payment.status,
        remote: remote.transfer.status,
      })
    }
  }

  if (payment.helper_profile_id) {
    const { data: connectAccount, error } = await admin
      .from('connect_accounts')
      .select('*')
      .eq('profile_id', payment.helper_profile_id)
      .maybeSingle()

    if (error) throw error

    remote.connect_account = connectAccount

    if (connectAccount?.stripe_account_id && remote.transfer?.destination && connectAccount.stripe_account_id !== remote.transfer.destination) {
      addFinding(findings, 'critical', 'connect_destination_mismatch', 'Transfer destination does not match the helper Connect account.', {
        local: connectAccount.stripe_account_id,
        remote: remote.transfer.destination,
      })
    }
  }

  const localStatus = payment.reconciliation_status || null
  if (classifyStatus(findings) === 'reconciled' && localStatus && localStatus !== 'reconciled') {
    addFinding(findings, 'warning', 'local_reconciliation_marker', 'Stripe and Supabase look aligned, but the local row is not marked reconciled.', {
      local: localStatus,
    })
  }

  const status = classifyStatus(findings)
  const report = {
    ok: true,
    reconciled_at: new Date().toISOString(),
    payment_id: payment.id,
    task_id: payment.task_id,
    status,
    matches,
    findings,
    local: {
      payment_status: payment.status,
      reconciliation_status: payment.reconciliation_status || null,
      stripe_checkout_session_id: payment.stripe_checkout_session_id || null,
      stripe_payment_intent_id: payment.stripe_payment_intent_id || null,
      stripe_transfer_id: payment.stripe_transfer_id || null,
    },
    remote: {
      checkout_session_status: remote.checkout_session?.status || null,
      payment_intent_status: remote.payment_intent?.status || null,
      transfer_status: remote.transfer?.status || null,
      connect_account_id: remote.connect_account?.stripe_account_id || null,
    },
  }

  await writeJsonFile(FINANCIAL_RECONCILE_ARTIFACT, report)
  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  const report = {
    ok: false,
    reconciled_at: new Date().toISOString(),
    error: error?.message || String(error),
  }

  writeJsonFile(FINANCIAL_RECONCILE_ARTIFACT, report).catch(() => null)
  console.error(report.error)
  process.exitCode = 1
})
