import { randomUUID } from 'node:crypto'
import { loadServerEnv } from '../config/env.js'
import { supabaseAdmin } from './supabase.service.js'
import {
  stripe,
  syncStripeAccountByAccountId,
} from './stripe.service.js'
import {
  createIdempotentLedgerEntry,
  createIdempotentAuditEvent,
  ensureIdempotencyKey,
  getOrCreateCorrelationId,
} from './financial.service.js'

const { env } = loadServerEnv()
const PLATFORM_FEE_BPS = Number.parseInt(globalThis.process?.env?.HELPME_PLATFORM_FEE_BPS ?? '0', 10)
const SAFE_PLATFORM_FEE_BPS = Number.isFinite(PLATFORM_FEE_BPS) && PLATFORM_FEE_BPS >= 0 ? PLATFORM_FEE_BPS : 0

const TERMINAL_PAYMENT_STATUSES = new Set([
  'captured',
  'processing',
  'held',
  'release_pending',
  'transferring',
  'released',
  'refunded',
  'disputed',
  'external_agreed',
])

function createPaymentError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function ensureSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }
}

function normalizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeAmountCents(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    return null
  }

  return Math.max(Math.round(amount), 0)
}

function buildUrl(pathname, query = {}) {
  const url = new URL(pathname, env.APP_URL)

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    url.searchParams.set(key, String(value))
  }

  return url.toString()
}

export function calculateCheckoutAmounts(task) {
  const amountCents = normalizeAmountCents(task?.price * 100)

  if (!amountCents) {
    throw new Error('El precio de la tarea no es valido para generar el checkout.')
  }

  const platformFeeCents = Math.max(Math.round((amountCents * SAFE_PLATFORM_FEE_BPS) / 10_000), 0)
  const helperAmountCents = Math.max(amountCents - platformFeeCents, 0)

  return {
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents,
    helper_amount_cents: helperAmountCents,
    currency: 'eur',
    platform_fee_bps: SAFE_PLATFORM_FEE_BPS,
  }
}

async function getTaskById(taskId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('id, created_by, accepted_by, title, description, category, price, status, created_at, updated_at')
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function getPaymentById(paymentId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function getActivePremiumSubscription(userId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, user_id, subscription_status, provider, current_period_end')
    .eq('user_id', userId)
    .in('subscription_status', ['active', 'trialing'])
    .order('current_period_end', { ascending: false, nullsFirst: false })
    .limit(5)

  if (error) {
    throw error
  }

  return (data || []).find((subscription) => {
    if (!subscription.current_period_end) return true

    return new Date(subscription.current_period_end).getTime() > Date.now()
  }) || null
}

async function getTransferByPaymentId(paymentId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('transfers')
    .select('*')
    .eq('payment_id', paymentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function getHelperConnectAccount(helperProfileId) {
  ensureSupabaseAdmin()

  let { data: connectAccount, error } = await supabaseAdmin
    .from('connect_accounts')
    .select('*')
    .eq('profile_id', helperProfileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (
    connectAccount &&
    connectAccount.charges_enabled &&
    connectAccount.payouts_enabled &&
    connectAccount.details_submitted
  ) {
    return connectAccount
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, stripe_account_id')
    .eq('id', helperProfileId)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (profile?.stripe_account_id) {
    await syncStripeAccountByAccountId(profile.stripe_account_id)

    const { data: refreshedAccount, error: refreshedError } = await supabaseAdmin
      .from('connect_accounts')
      .select('*')
      .eq('profile_id', helperProfileId)
      .maybeSingle()

    if (refreshedError) {
      throw refreshedError
    }

    connectAccount = refreshedAccount || null
  }

  if (
    !connectAccount ||
    !connectAccount.charges_enabled ||
    !connectAccount.payouts_enabled ||
    !connectAccount.details_submitted
  ) {
    throw createPaymentError('El helper no tiene Stripe Connect activo.', 409)
  }

  return connectAccount
}

async function getOrCreateCheckoutPayment({ task, requesterId, helperId, amounts }) {
  ensureSupabaseAdmin()

  const correlationId = getOrCreateCorrelationId(task)
  const idempotencyKey = ensureIdempotencyKey(`checkout:task:${task.id}`, 'checkout')

  const { data: existingPayment, error: existingError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('task_id', task.id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existingPayment) {
    if (existingPayment.requester_profile_id !== requesterId || existingPayment.helper_profile_id !== helperId) {
      throw createPaymentError('La tarea tiene un pago asociado que no coincide con los participantes actuales.', 409)
    }

    if (TERMINAL_PAYMENT_STATUSES.has(existingPayment.status)) {
      throw createPaymentError('La tarea ya tiene un pago finalizado.', 409)
    }

    const nextMetadata = {
      ...(existingPayment.metadata || {}),
      checkout: {
        task_id: task.id,
        requested_at: new Date().toISOString(),
      },
    }

    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('payments')
      .update({
        requester_profile_id: requesterId,
        helper_profile_id: helperId,
        amount_cents: amounts.amount_cents,
        platform_fee_cents: amounts.platform_fee_cents,
        helper_amount_cents: amounts.helper_amount_cents,
        currency: amounts.currency,
        status: 'requires_checkout',
        correlation_id: existingPayment.correlation_id || correlationId,
        idempotency_key: existingPayment.idempotency_key || idempotencyKey,
        reconciliation_status: 'pending',
        reconciliation_error: null,
        metadata: nextMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPayment.id)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    return updatedPayment
  }

  const { data: insertedPayment, error: insertError } = await supabaseAdmin
    .from('payments')
    .insert({
      task_id: task.id,
      requester_profile_id: requesterId,
      helper_profile_id: helperId,
      payer_id: requesterId,
      receiver_id: helperId,
      amount: Number(task.price || 0),
      platform_fee: amounts.platform_fee_cents / 100,
      amount_cents: amounts.amount_cents,
      platform_fee_cents: amounts.platform_fee_cents,
      helper_amount_cents: amounts.helper_amount_cents,
      currency: amounts.currency,
      status: 'requires_checkout',
      correlation_id: correlationId,
      idempotency_key: idempotencyKey,
      reconciliation_status: 'pending',
      metadata: {
        checkout: {
          task_id: task.id,
          requested_at: new Date().toISOString(),
        },
      },
    })
    .select('*')
    .single()

  if (insertError) {
    throw insertError
  }

  return insertedPayment
}

async function createCheckoutSession({ payment, task, requester, helperId }) {
  const successUrl = buildUrl('/stripe/return', {
    flow: 'payment',
    task_id: task.id,
    payment_id: payment.id,
    session_id: '{CHECKOUT_SESSION_ID}',
  })

  const cancelUrl = buildUrl(`/task/${task.id}`, {
    checkout: 'cancelled',
  })

  const idempotencyKey = ensureIdempotencyKey(payment.idempotency_key || `checkout:task:${task.id}`, 'checkout-session')

  const metadata = {
    task_id: task.id,
    payment_id: payment.id,
    requester_profile_id: requester.id,
    helper_profile_id: helperId,
    correlation_id: payment.correlation_id,
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: payment.id,
      customer_email: requester.email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: payment.currency || 'eur',
            unit_amount: payment.amount_cents,
            product_data: {
              name: task.title,
              description: task.description?.slice(0, 250) || undefined,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
    },
    {
      idempotencyKey,
    },
  )

  return session
}

function getTransferIdempotencyKey(payment) {
  return ensureIdempotencyKey(`transfer:payment:${payment.id}`, 'transfer')
}

async function createTransferAudit({
  eventType,
  payment,
  task,
  transfer,
  requesterId,
  severity = 'info',
  metadata = {},
}) {
  return createIdempotentAuditEvent({
    eventType,
    severity,
    actorType: requesterId ? 'requester' : 'backend',
    actorProfileId: requesterId || null,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      task_id: task?.id || payment.task_id,
      transfer_id: transfer?.stripe_transfer_id || transfer?.id || null,
      transfer_status: transfer?.status || null,
      payment_status: payment.status,
    },
    correlationId: payment.correlation_id || transfer?.correlation_id || getOrCreateCorrelationId(payment),
    metadata: {
      task_id: task?.id || payment.task_id,
      payment_id: payment.id,
      helper_profile_id: payment.helper_profile_id,
      requester_profile_id: payment.requester_profile_id,
      ...metadata,
    },
  })
}

async function createReleaseLedgerEntry(payment, transfer, eventType = 'release_authorized') {
  return createIdempotentLedgerEntry({
    paymentId: payment.id,
    requesterProfileId: payment.requester_profile_id,
    helperProfileId: payment.helper_profile_id,
    entryType: eventType,
    direction: 'debit',
    accountCode: eventType === 'release_authorized' ? 'payments.release_authorized' : `payments.${eventType}`,
    amountCents: payment.helper_amount_cents,
    platformFeeCents: payment.platform_fee_cents || 0,
    helperAmountCents: payment.helper_amount_cents || 0,
    currency: payment.currency || 'eur',
    stripeObjectType: 'transfer',
    stripeObjectId: transfer?.stripe_transfer_id || transfer?.id || payment.id,
    sourceEventId: null,
    correlationId: payment.correlation_id || transfer?.correlation_id || getOrCreateCorrelationId(payment),
    idempotencyKey: ensureIdempotencyKey(
      `ledger:release:${payment.id}:${eventType}:${transfer?.stripe_transfer_id || transfer?.id || 'draft'}`,
      'ledger',
    ),
    createdBySystem: 'backend',
    metadata: {
      payment_id: payment.id,
      task_id: payment.task_id,
      transfer_id: transfer?.stripe_transfer_id || transfer?.id || null,
      event_type: eventType,
    },
  })
}

async function setPaymentTransferState(paymentId, updates) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

async function setTransferRow(payment, updates, conflictTarget = 'payment_id') {
  ensureSupabaseAdmin()

  const { metadata: updateMetadata = {}, ...restUpdates } = updates || {}

  const payload = {
    payment_id: payment.id,
    requester_profile_id: payment.requester_profile_id,
    helper_profile_id: payment.helper_profile_id,
    connect_account_profile_id: payment.helper_profile_id,
    amount_cents: payment.helper_amount_cents,
    currency: payment.currency || 'eur',
    correlation_id: payment.correlation_id || getOrCreateCorrelationId(payment),
    idempotency_key: getTransferIdempotencyKey(payment),
    metadata: {
      payment_id: payment.id,
      task_id: payment.task_id,
      requester_profile_id: payment.requester_profile_id,
      helper_profile_id: payment.helper_profile_id,
      ...updateMetadata,
    },
    updated_at: new Date().toISOString(),
    ...restUpdates,
  }

  const { data, error } = await supabaseAdmin
    .from('transfers')
    .upsert(payload, { onConflict: conflictTarget })
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return data
}

async function createStripeTransferForPayment({ payment, helperConnectAccount }) {
  const idempotencyKey = getTransferIdempotencyKey(payment)
  const metadata = {
    payment_id: payment.id,
    task_id: payment.task_id,
    requester_profile_id: payment.requester_profile_id,
    helper_profile_id: payment.helper_profile_id,
    correlation_id: payment.correlation_id || getOrCreateCorrelationId(payment),
  }

  const transfer = await stripe.transfers.create(
    {
      amount: payment.helper_amount_cents,
      currency: payment.currency || 'eur',
      destination: helperConnectAccount.stripe_account_id,
      description: `HelpMe release for payment ${payment.id}`,
      metadata,
      transfer_group: payment.task_id || payment.id,
    },
    {
      idempotencyKey,
    },
  )

  return transfer
}

export async function createTaskCheckout({ taskId, requester }) {
  ensureSupabaseAdmin()
  const checkoutStartedAt = performance.now()
  const timings = {}

  if (!requester?.id) {
    throw createPaymentError('Necesitas iniciar sesion.', 401)
  }

  let stepStartedAt = performance.now()
  const task = await getTaskById(taskId)
  timings.task_lookup_ms = Math.round(performance.now() - stepStartedAt)

  if (!task) {
    throw createPaymentError('La tarea no existe.', 404)
  }

  if (task.created_by !== requester.id) {
    throw createPaymentError('No puedes pagar una tarea ajena.', 403)
  }

  if (task.status !== 'assigned') {
    throw createPaymentError('La tarea debe estar asignada antes de iniciar el pago.', 409)
  }

  if (!task.accepted_by) {
    throw createPaymentError('La tarea no tiene helper asignado.', 409)
  }

  stepStartedAt = performance.now()
  await getHelperConnectAccount(task.accepted_by)
  timings.connect_account_ms = Math.round(performance.now() - stepStartedAt)

  const amounts = calculateCheckoutAmounts(task)
  stepStartedAt = performance.now()
  const payment = await getOrCreateCheckoutPayment({
    task,
    requesterId: requester.id,
    helperId: task.accepted_by,
    amounts,
  })
  timings.payment_record_ms = Math.round(performance.now() - stepStartedAt)

  stepStartedAt = performance.now()
  const session = await createCheckoutSession({
    payment,
    task,
    requester,
    helperId: task.accepted_by,
  })
  timings.stripe_session_ms = Math.round(performance.now() - stepStartedAt)

  const stripePaymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || null

  stepStartedAt = performance.now()
  const { data: updatedPayment, error: updateError } = await supabaseAdmin
    .from('payments')
    .update({
      stripe_checkout_session_id: session.id,
      stripe_checkout_session_status: session.status || 'open',
      stripe_payment_intent_id: stripePaymentIntentId,
      status: 'requires_checkout',
      correlation_id: payment.correlation_id || getOrCreateCorrelationId(payment),
      amount_cents: amounts.amount_cents,
      platform_fee_cents: amounts.platform_fee_cents,
      helper_amount_cents: amounts.helper_amount_cents,
      currency: amounts.currency,
      updated_at: new Date().toISOString(),
    })
    .eq('id', payment.id)
    .select('*')
    .single()

  if (updateError) {
    throw updateError
  }
  timings.payment_update_ms = Math.round(performance.now() - stepStartedAt)

  stepStartedAt = performance.now()
  await createIdempotentAuditEvent({
    eventType: 'checkout_session_created',
    severity: 'info',
    actorType: 'backend',
    entityType: 'payment',
    entityId: updatedPayment.id,
    afterState: {
      task_id: task.id,
      checkout_session_id: session.id,
      amount_cents: amounts.amount_cents,
      currency: amounts.currency,
    },
    correlationId: updatedPayment.correlation_id || payment.correlation_id || randomUUID(),
    metadata: {
      task_id: task.id,
      payment_id: updatedPayment.id,
      stripe_checkout_session_id: session.id,
    },
  })
  timings.audit_ms = Math.round(performance.now() - stepStartedAt)
  timings.total_ms = Math.round(performance.now() - checkoutStartedAt)

  if (globalThis.process?.env?.NODE_ENV !== 'production') {
    console.info('[payments.checkout] timing', {
      task_id: task.id,
      payment_id: updatedPayment.id,
      ...timings,
    })
  }

  return {
    checkout_url: session.url,
    payment_id: updatedPayment.id,
  }
}

export async function createExternalPaymentAgreement({ taskId, requester }) {
  ensureSupabaseAdmin()

  if (!requester?.id) {
    throw createPaymentError('Necesitas iniciar sesion.', 401)
  }

  const task = await getTaskById(taskId)

  if (!task) {
    throw createPaymentError('La tarea no existe.', 404)
  }

  if (task.created_by !== requester.id) {
    throw new Error('No puedes confirmar pago externo en una tarea ajena.')
  }

  if (task.status !== 'assigned') {
    throw new Error('La tarea debe estar asignada antes de continuar con pago externo.')
  }

  if (!task.accepted_by) {
    throw createPaymentError('La tarea no tiene helper asignado.', 409)
  }

  const premiumSubscription = await getActivePremiumSubscription(requester.id)

  if (!premiumSubscription) {
    throw new Error('Necesitas Premium activo para coordinar un pago externo.')
  }

  const amountCents = normalizeAmountCents(task.price * 100)

  if (!amountCents) {
    throw new Error('El precio de la tarea no es valido.')
  }

  const correlationId = getOrCreateCorrelationId(task)
  const idempotencyKey = ensureIdempotencyKey(`external-payment:task:${task.id}`, 'external-payment')

  const { data: existingPayment, error: existingError } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('task_id', task.id)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (
    existingPayment &&
    existingPayment.provider === 'stripe' &&
    TERMINAL_PAYMENT_STATUSES.has(existingPayment.status) &&
    existingPayment.status !== 'external_agreed'
  ) {
    throw new Error('La tarea ya tiene un pago seguro asociado.')
  }

  const paymentPayload = {
    task_id: task.id,
    requester_profile_id: requester.id,
    helper_profile_id: task.accepted_by,
    payer_id: requester.id,
    receiver_id: task.accepted_by,
    amount: Number(task.price || 0),
    platform_fee: 0,
    amount_cents: amountCents,
    platform_fee_cents: 0,
    helper_amount_cents: amountCents,
    currency: 'eur',
    provider: 'external',
    status: 'external_agreed',
    external_payment_confirmed_at: new Date().toISOString(),
    correlation_id: existingPayment?.correlation_id || correlationId,
    idempotency_key: existingPayment?.idempotency_key || idempotencyKey,
    reconciliation_status: 'reconciled',
    reconciliation_error: null,
    metadata: {
      ...(existingPayment?.metadata || {}),
      external_payment: {
        agreed_by: requester.id,
        agreed_at: new Date().toISOString(),
        subscription_id: premiumSubscription.id,
        warning_acknowledged: true,
      },
    },
    updated_at: new Date().toISOString(),
  }

  const paymentQuery = existingPayment
    ? supabaseAdmin
        .from('payments')
        .update(paymentPayload)
        .eq('id', existingPayment.id)
    : supabaseAdmin
        .from('payments')
        .insert(paymentPayload)

  const { data: payment, error: paymentError } = await paymentQuery
    .select('*')
    .single()

  if (paymentError) {
    throw paymentError
  }

  const { data: updatedTask, error: taskError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'in_progress',
      modified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .eq('created_by', requester.id)
    .eq('accepted_by', task.accepted_by)
    .eq('status', 'assigned')
    .select('id, created_by, accepted_by, status')
    .maybeSingle()

  if (taskError) {
    throw taskError
  }

  if (!updatedTask) {
    throw new Error('No se pudo activar la tarea con pago externo.')
  }

  await createIdempotentAuditEvent({
    eventType: 'external_payment_agreed',
    severity: 'info',
    actorType: 'requester',
    actorProfileId: requester.id,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      task_id: task.id,
      payment_status: payment.status,
      provider: payment.provider,
      task_status: updatedTask.status,
    },
    correlationId: payment.correlation_id || correlationId || randomUUID(),
    metadata: {
      task_id: task.id,
      payment_id: payment.id,
      helper_profile_id: task.accepted_by,
      subscription_id: premiumSubscription.id,
    },
  })

  return {
    payment_id: payment.id,
    task_id: task.id,
    task_status: updatedTask.status,
    provider: payment.provider,
    status: payment.status,
  }
}

export async function releasePaymentFunds({ paymentId, requester }) {
  ensureSupabaseAdmin()

  if (!requester?.id) {
    throw new Error('Necesitas iniciar sesion.')
  }

  const payment = await getPaymentById(paymentId)

  if (!payment) {
    throw new Error('El pago no existe.')
  }

  if (payment.requester_profile_id !== requester.id) {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'No puedes liberar un pago ajeno.',
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: payment.task_id,
      },
    })
    throw new Error('No puedes liberar un pago ajeno.')
  }

  if (payment.provider === 'external' || payment.status === 'external_agreed') {
    await createIdempotentAuditEvent({
      eventType: 'external_payment_release_skipped',
      severity: 'info',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'External payments are coordinated outside HelpMe and do not release Stripe funds.',
        payment_status: payment.status,
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: payment.task_id,
      },
    })

    return {
      payment_id: payment.id,
      task_id: payment.task_id,
      payment_status: payment.status,
      provider: payment.provider,
      external: true,
      skipped_release: true,
    }
  }

  const task = await getTaskById(payment.task_id)

  if (!task) {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'La tarea no existe.',
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: payment.task_id,
      },
    })
    throw new Error('La tarea no existe.')
  }

  if (task.created_by !== requester.id) {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'No puedes liberar pagos de una tarea ajena.',
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })
    throw new Error('No puedes liberar pagos de una tarea ajena.')
  }

  const existingTransfer = await getTransferByPaymentId(payment.id)
  if (
    existingTransfer &&
    existingTransfer.status !== 'failed' &&
    ['release_pending', 'transferring', 'released'].includes(payment.status) &&
    ['completed', 'closed'].includes(task.status)
  ) {
    await createIdempotentAuditEvent({
      eventType: 'release_blocked',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'La transferencia ya existe o ya fue procesada.',
        transfer_status: existingTransfer.status,
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
        transfer_id: existingTransfer.id,
      },
    })

    if (existingTransfer.status === 'paid' || existingTransfer.status === 'pending' || existingTransfer.status === 'reversed') {
      return {
        payment_id: payment.id,
        task_id: task.id,
        transfer_id: existingTransfer.id,
        stripe_transfer_id: existingTransfer.stripe_transfer_id,
        transfer_status: existingTransfer.status,
        payment_status: payment.status,
        duplicate: true,
      }
    }

    if (existingTransfer.status === 'draft') {
      return {
        payment_id: payment.id,
        task_id: task.id,
        transfer_id: existingTransfer.id,
        stripe_transfer_id: existingTransfer.stripe_transfer_id,
        transfer_status: existingTransfer.status,
        payment_status: payment.status,
        duplicate: true,
      }
    }
  }

  if (existingTransfer && existingTransfer.status !== 'failed') {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'Existing transfer is inconsistent with the current payment/task state.',
        transfer_status: existingTransfer.status,
        payment_status: payment.status,
        task_status: task.status,
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
        transfer_id: existingTransfer.id,
      },
    })

    throw new Error('La transferencia existente no coincide con el estado actual del pago.')
  }

  if (payment.status !== 'held') {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'El pago debe estar retenido antes de autorizar la liberacion.',
        payment_status: payment.status,
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })
    throw new Error('El pago debe estar retenido antes de autorizar la liberacion.')
  }

  if (task.status !== 'completed') {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'La tarea debe estar completada antes de liberar el pago.',
        task_status: task.status,
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })
    throw new Error('La tarea debe estar completada antes de liberar el pago.')
  }

  let helperConnectAccount

  try {
    helperConnectAccount = await getHelperConnectAccount(payment.helper_profile_id)
  } catch (error) {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: normalizeText(error?.message) || 'El helper no tiene una cuenta Stripe valida.',
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })

    throw error
  }

  if (!helperConnectAccount?.stripe_account_id) {
    await createIdempotentAuditEvent({
      eventType: 'release_validation_failed',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        reason: 'El helper no tiene una cuenta Stripe valida.',
      },
      correlationId: payment.correlation_id || getOrCreateCorrelationId(payment),
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })
    throw new Error('El helper no tiene una cuenta Stripe valida.')
  }

  const correlationId = payment.correlation_id || getOrCreateCorrelationId(payment)
  const validationAudit = await createIdempotentAuditEvent({
    eventType: 'payment_release_requested',
    severity: 'info',
    actorType: 'requester',
    actorProfileId: requester.id,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      payment_status: payment.status,
      task_status: task.status,
    },
    correlationId,
    metadata: {
      payment_id: payment.id,
      task_id: task.id,
    },
  })

  await createReleaseLedgerEntry(payment, null, 'release_authorized')

  const lockedPayment = await setPaymentTransferState(payment.id, {
    status: 'release_pending',
    correlation_id: correlationId,
    reconciliation_status: 'pending',
    reconciliation_error: null,
    metadata: {
      ...(payment.metadata || {}),
      release: {
        requested_by: requester.id,
        requested_at: new Date().toISOString(),
      },
    },
  })

  const draftTransfer = await setTransferRow(payment, {
    status: 'draft',
    failure_code: null,
    stripe_transfer_id: null,
    stripe_balance_transaction_id: null,
    reversed_at: null,
    metadata: {
      release: {
        requested_by: requester.id,
        requested_at: new Date().toISOString(),
      },
    },
  })

  await createTransferAudit({
    eventType: 'payment_release_authorized',
    payment: lockedPayment || payment,
    task,
    transfer: draftTransfer,
    requesterId: requester.id,
    metadata: {
      validation_audit_id: validationAudit?.id || null,
    },
  })

  try {
    const transfer = await createStripeTransferForPayment({
      payment: lockedPayment || payment,
      helperConnectAccount,
    })

    const nextTransfer = await setTransferRow(lockedPayment || payment, {
      status: 'pending',
      stripe_transfer_id: transfer.id,
      stripe_balance_transaction_id: transfer.balance_transaction || null,
      failure_code: null,
      reversed_at: null,
      metadata: {
        release: {
          requested_by: requester.id,
          requested_at: new Date().toISOString(),
        },
        stripe_transfer_id: transfer.id,
      },
    })

    await setPaymentTransferState((lockedPayment || payment).id, {
      status: 'transferring',
      correlation_id: correlationId,
      reconciliation_status: 'reconciled',
      reconciliation_error: null,
    })

    await createTransferAudit({
      eventType: 'transfer_created',
      payment: lockedPayment || payment,
      task,
      transfer: nextTransfer,
      requesterId: requester.id,
      metadata: {
        stripe_transfer_id: transfer.id,
      },
    })

    return {
      payment_id: payment.id,
      task_id: task.id,
      transfer_id: nextTransfer.id,
      stripe_transfer_id: transfer.id,
      transfer_status: nextTransfer.status,
      payment_status: 'transferring',
      duplicate: false,
    }
  } catch (error) {
    await setTransferRow(lockedPayment || payment, {
      status: 'failed',
      failure_code: normalizeText(error?.code) || normalizeText(error?.message) || 'transfer_failed',
      metadata: {
        release: {
          requested_by: requester.id,
          requested_at: new Date().toISOString(),
        },
        error: normalizeText(error?.message) || 'Transfer creation failed.',
      },
    })

    await setPaymentTransferState((lockedPayment || payment).id, {
      status: 'held',
      reconciliation_status: 'needs_review',
      reconciliation_error: normalizeText(error?.message) || 'Transfer creation failed.',
    })

    await createIdempotentAuditEvent({
      eventType: 'release_blocked',
      severity: 'warning',
      actorType: 'requester',
      actorProfileId: requester.id,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        error: normalizeText(error?.message) || 'Transfer creation failed.',
      },
      correlationId,
      metadata: {
        payment_id: payment.id,
        task_id: task.id,
      },
    })

    throw error
  }
}
