import { loadServerEnv } from '../config/env.js'
import { stripe, syncStripeAccountByAccountId } from './stripe.service.js'
import { supabaseAdmin } from './supabase.service.js'

const DEFAULT_LEASE_SECONDS = 300
const MAX_RELEASE_ATTEMPTS = 5

function createReleaseError(message, statusCode = 409, code = 'payment_release_failed') {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

function ensureAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }
}

function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function stripeId(value) {
  if (typeof value === 'string') return text(value)
  if (value && typeof value.id === 'string') return text(value.id)
  return null
}

function normalizeCurrency(value) {
  return text(value)?.toLowerCase() || null
}

function isUncertainStripeError(error) {
  const statusCode = Number(error?.statusCode || error?.status)
  if (!Number.isFinite(statusCode)) return true
  if (statusCode >= 500 || statusCode === 429) return true

  return ['StripeAPIError', 'StripeConnectionError', 'StripeRateLimitError'].includes(error?.type)
}

async function rpc(name, args) {
  ensureAdmin()
  const { data, error } = await supabaseAdmin.rpc(name, args)
  if (error) throw error
  return data
}

async function getPayment(paymentId) {
  ensureAdmin()
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getTask(taskId) {
  ensureAdmin()
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, created_by, accepted_by, status, title, completed_at')
    .eq('id', taskId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getTransfer(paymentId) {
  ensureAdmin()
  const { data, error } = await supabaseAdmin
    .from('transfers')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getReleaseJob(paymentId) {
  ensureAdmin()
  const { data, error } = await supabaseAdmin
    .from('payment_release_jobs')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getReadyConnectAccount(helperProfileId) {
  ensureAdmin()

  let { data: account, error } = await supabaseAdmin
    .from('connect_accounts')
    .select('*')
    .eq('profile_id', helperProfileId)
    .maybeSingle()

  if (error) throw error

  if (
    !account?.stripe_account_id
    || !account.charges_enabled
    || !account.payouts_enabled
    || !account.details_submitted
  ) {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', helperProfileId)
      .maybeSingle()

    if (profileError) throw profileError
    if (profile?.stripe_account_id) {
      await syncStripeAccountByAccountId(profile.stripe_account_id)
      const refreshed = await supabaseAdmin
        .from('connect_accounts')
        .select('*')
        .eq('profile_id', helperProfileId)
        .maybeSingle()

      if (refreshed.error) throw refreshed.error
      account = refreshed.data || null
    }
  }

  if (
    !account?.stripe_account_id
    || !account.charges_enabled
    || !account.payouts_enabled
    || !account.details_submitted
  ) {
    throw createReleaseError(
      'El helper no tiene Stripe Connect listo para recibir el pago.',
      409,
      'helper_connect_not_ready',
    )
  }

  return account
}

async function ensureChargeId(payment) {
  if (text(payment.stripe_charge_id)) return payment.stripe_charge_id

  if (!text(payment.stripe_payment_intent_id)) {
    throw createReleaseError('El pago retenido no tiene un Charge de Stripe.', 409, 'missing_stripe_charge')
  }

  const intent = await stripe.paymentIntents.retrieve(payment.stripe_payment_intent_id, {
    expand: ['latest_charge'],
  })
  const chargeId = stripeId(intent.latest_charge)

  if (!chargeId) {
    throw createReleaseError('El PaymentIntent no tiene un Charge disponible.', 409, 'missing_stripe_charge')
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({
      stripe_charge_id: chargeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .select('*')
    .single()

  if (error) throw error
  return data.stripe_charge_id
}

async function validateChargeForRelease(payment, chargeId) {
  const charge = await stripe.charges.retrieve(chargeId)
  const expectedAmount = Number(payment.helper_amount_cents)
  const expectedCurrency = normalizeCurrency(payment.currency)

  if (!charge.paid || charge.refunded || charge.amount < expectedAmount || normalizeCurrency(charge.currency) !== expectedCurrency) {
    throw createReleaseError(
      'El Charge no está disponible para liberar este importe.',
      409,
      'stripe_charge_not_releasable',
    )
  }

  return charge
}

function validateTransfer(payment, connectAccount, transfer, { allowLegacySource = false } = {}) {
  const expectedAmount = Number(payment.helper_amount_cents)
  const expectedCurrency = normalizeCurrency(payment.currency)
  const sourceTransaction = stripeId(transfer.source_transaction)

  if (!transfer?.id) {
    throw createReleaseError('Stripe no devolvió un Transfer válido.', 502, 'invalid_stripe_transfer')
  }

  if (
    transfer.amount !== expectedAmount
    || normalizeCurrency(transfer.currency) !== expectedCurrency
    || stripeId(transfer.destination) !== connectAccount.stripe_account_id
    || (!allowLegacySource && sourceTransaction !== payment.stripe_charge_id)
  ) {
    throw createReleaseError('El Transfer de Stripe no coincide con el pago local.', 409, 'stripe_transfer_mismatch')
  }

  if (transfer.reversed) {
    throw createReleaseError('El Transfer de Stripe fue revertido.', 409, 'stripe_transfer_reversed')
  }
}

async function finalizeRelease({ job, payment, connectAccount, transfer, allowLegacySource = false }) {
  validateTransfer(payment, connectAccount, transfer, { allowLegacySource })

  const sourceTransaction = stripeId(transfer.source_transaction)
  const result = await rpc('finalize_payment_release', {
    p_job_id: job.id,
    p_payment_id: payment.id,
    p_stripe_transfer_id: transfer.id,
    p_stripe_balance_transaction_id: stripeId(transfer.balance_transaction),
    p_destination_account_id: stripeId(transfer.destination),
    p_source_transaction_id: sourceTransaction,
    p_amount_cents: transfer.amount,
    p_currency: normalizeCurrency(transfer.currency),
    p_attempt_idempotency_key: job.idempotency_key || null,
  })

  return result
}

async function scheduleRetry(job, error, { markNeedsReview = false, forceUncertain = false } = {}) {
  const code = text(error?.code) || text(error?.type) || 'payment_release_failed'
  const definitive = forceUncertain ? false : !isUncertainStripeError(error)
  const data = await rpc('schedule_payment_release_retry', {
    p_job_id: job.id,
    p_error_code: code,
    p_error_message: text(error?.message) || 'Payment release attempt failed.',
    p_definitive: definitive,
    p_mark_needs_review: markNeedsReview || definitive,
  })

  return {
    job_id: job.id,
    payment_id: job.payment_id,
    task_id: job.task_id,
    outcome: data?.status === 'dead_letter' ? 'dead_letter' : 'retry_wait',
    error_code: code,
  }
}

async function processClaimedJob(job) {
  const payment = await getPayment(job.payment_id)
  const task = await getTask(job.task_id)

  if (!payment || !task) {
    return scheduleRetry(job, createReleaseError('No existe el pago o la tarea de la liberación.', 404, 'release_context_missing'), {
      markNeedsReview: true,
    })
  }

  if (payment.status === 'released' && task.status === 'closed') {
    return {
      job_id: job.id,
      payment_id: payment.id,
      task_id: task.id,
      outcome: 'already_released',
    }
  }

  if (payment.provider === 'external') {
    return scheduleRetry(job, createReleaseError('Los pagos externos no usan Stripe Transfer.', 409, 'external_payment'), {
      markNeedsReview: true,
    })
  }

  if (task.status !== 'completed' || !payment.helper_profile_id || payment.status === 'released') {
    return scheduleRetry(job, createReleaseError('El estado local no permite liberar el pago.', 409, 'invalid_release_state'), {
      markNeedsReview: true,
    })
  }

  try {
    const connectAccount = await getReadyConnectAccount(payment.helper_profile_id)
    const existingTransfer = await getTransfer(payment.id)

    if (existingTransfer?.stripe_transfer_id) {
      const transfer = await stripe.transfers.retrieve(existingTransfer.stripe_transfer_id)
      try {
        const finalized = await finalizeRelease({
          job,
          payment,
          connectAccount,
          transfer,
          allowLegacySource: !stripeId(transfer.source_transaction),
        })
        return { ...finalized, outcome: 'released' }
      } catch (error) {
        return scheduleRetry(job, error, { forceUncertain: true })
      }
    }

    const chargeId = await ensureChargeId(payment)
    const currentPayment = chargeId === payment.stripe_charge_id
      ? payment
      : { ...payment, stripe_charge_id: chargeId }

    await validateChargeForRelease(currentPayment, chargeId)

    const transfer = await stripe.transfers.create(
      {
        amount: currentPayment.helper_amount_cents,
        currency: normalizeCurrency(currentPayment.currency),
        destination: connectAccount.stripe_account_id,
        source_transaction: chargeId,
        description: `HelpMe release for payment ${currentPayment.id}`,
        transfer_group: currentPayment.task_id || currentPayment.id,
        metadata: {
          payment_id: currentPayment.id,
          task_id: currentPayment.task_id,
          requester_profile_id: currentPayment.requester_profile_id,
          helper_profile_id: currentPayment.helper_profile_id,
          correlation_id: currentPayment.correlation_id || '',
          release_job_id: job.id,
        },
      },
      { idempotencyKey: job.idempotency_key },
    )

    try {
      const finalized = await finalizeRelease({ job, payment: currentPayment, connectAccount, transfer })
      return { ...finalized, outcome: 'released' }
    } catch (error) {
      // Stripe accepted the Transfer. Keep the same key until the local finalizer
      // or transfer.created can recover the durable state.
      return scheduleRetry(job, error, { forceUncertain: true })
    }
  } catch (error) {
    return scheduleRetry(job, error, {
      markNeedsReview: error?.code === 'helper_connect_not_ready',
    })
  }
}

export async function claimPaymentReleaseJobs({ limit = 10, jobId = null } = {}) {
  const rows = await rpc('claim_payment_release_jobs', {
    p_limit: limit,
    p_lease_seconds: DEFAULT_LEASE_SECONDS,
    p_job_id: jobId,
  })

  // The RPC returns the job's primary key as `job_id`, while the rest of this service
  // (and the finalize/retry RPCs, which have no default for p_job_id) read `job.id`.
  // Without this mapping p_job_id went out as undefined, supabase-js dropped the key
  // and PostgREST answered PGRST202 — after Stripe had already created the transfer.
  return (rows || []).map((row) => ({ ...row, id: row.id ?? row.job_id }))
}

export async function processPaymentReleaseJobs({ limit = 10, jobId = null } = {}) {
  const claimed = await claimPaymentReleaseJobs({ limit, jobId })
  const outcomes = []

  for (const job of claimed || []) {
    try {
      outcomes.push(await processClaimedJob(job))
    } catch (error) {
      outcomes.push({
        job_id: job.id,
        payment_id: job.payment_id,
        task_id: job.task_id,
        outcome: 'worker_error',
        error_code: text(error?.code) || 'worker_error',
      })
    }
  }

  return outcomes
}

export async function completeTaskAndQueuePaymentRelease({ taskId, requester }) {
  if (!requester?.id) {
    throw createReleaseError('Necesitas iniciar sesión.', 401, 'unauthorized')
  }

  const rows = await rpc('queue_task_payment_release', {
    p_task_id: taskId,
    p_requester_id: requester.id,
  })
  const queued = Array.isArray(rows) ? rows[0] : rows

  if (!queued) {
    throw new Error('No se pudo registrar la liberación del pago.')
  }

  if (!queued.job_id) {
    return {
      ...queued,
      release_outcome: queued.job_status === 'external' ? 'external' : 'not_required',
    }
  }

  const outcomes = await processPaymentReleaseJobs({ jobId: queued.job_id, limit: 1 })
  const outcome = outcomes[0] || null

  return {
    ...queued,
    release_outcome: outcome?.outcome || 'queued',
    payment_status: outcome?.payment_status || queued.payment_status,
    task_status: outcome?.task_status || queued.task_status,
    stripe_transfer_id: outcome?.stripe_transfer_id || null,
  }
}

export async function requestPaymentReleaseForPayment({ paymentId, requester }) {
  if (!requester?.id) {
    throw createReleaseError('Necesitas iniciar sesión.', 401, 'unauthorized')
  }

  const payment = await getPayment(paymentId)
  if (!payment) {
    throw createReleaseError('El pago no existe.', 404, 'payment_not_found')
  }

  if (payment.requester_profile_id !== requester.id) {
    throw createReleaseError('No puedes liberar un pago ajeno.', 403, 'forbidden')
  }

  return completeTaskAndQueuePaymentRelease({ taskId: payment.task_id, requester })
}

export async function finalizeReleaseFromStripeTransfer({ paymentId, transfer }) {
  const payment = await getPayment(paymentId)
  const job = await getReleaseJob(paymentId)

  if (!payment || !job) {
    return null
  }

  const connectAccount = await getReadyConnectAccount(payment.helper_profile_id)
  return finalizeRelease({
    job,
    payment,
    connectAccount,
    transfer,
    allowLegacySource: !stripeId(transfer?.source_transaction),
  })
}

export async function markReleaseTransferReversed({ paymentId, transferId, reason }) {
  return rpc('mark_payment_transfer_reversed', {
    p_payment_id: paymentId,
    p_stripe_transfer_id: transferId,
    p_reason: reason || 'Transfer reversed.',
  })
}

export function getPaymentReleaseWorkerConfig() {
  const { env } = loadServerEnv()
  return {
    appUrl: env.APP_URL,
    maxAttempts: MAX_RELEASE_ATTEMPTS,
    leaseSeconds: DEFAULT_LEASE_SECONDS,
  }
}
