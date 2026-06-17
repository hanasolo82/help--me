import { createHash, randomUUID } from 'node:crypto'
import { stripe, syncStripeAccountFromWebhook } from './stripe.service.js'
import { supabaseAdmin } from './supabase.service.js'

const PAYMENT_STATUS_BLOCKING = new Set([
  'captured',
  'held',
  'release_pending',
  'transferring',
  'released',
  'external_agreed',
  'refunded',
  'disputed',
])

const PAYMENT_STATUS_FAILED_APPLICABLE = new Set([
  'draft',
  'pending',
  'requires_checkout',
  'processing',
  'failed',
])

const PAYMENT_STATUS_REFUND_APPLICABLE = new Set([
  'draft',
  'pending',
  'requires_checkout',
  'processing',
  'failed',
  'captured',
  'held',
  'disputed',
])

const PAYMENT_STATUS_DISPUTE_APPLICABLE = new Set([
  'draft',
  'pending',
  'requires_checkout',
  'processing',
  'failed',
  'captured',
  'held',
])

const STALE_WEBHOOK_PROCESSING_MS = 5 * 60 * 1000

const PAYOUT_STATUS_ORDER = {
  pending: 0,
  in_transit: 1,
  paid: 2,
  failed: 3,
  canceled: 4,
}

const LEDGER_ACCOUNT_CODES = {
  checkout_completed: 'payments.checkout_completed',
  charge_captured: 'payments.charge_captured',
  funds_held: 'payments.funds_held',
  payment_failed: 'payments.payment_failed',
  refund_succeeded: 'payments.refund_succeeded',
  dispute_opened: 'payments.dispute_opened',
  dispute_updated: 'payments.dispute_updated',
  dispute_closed: 'payments.dispute_closed',
  transfer_created: 'connect.transfer_created',
  transfer_paid: 'connect.transfer_paid',
  transfer_failed: 'connect.transfer_failed',
  transfer_reversed: 'connect.transfer_reversed',
  release_authorized: 'payments.release_authorized',
  payout_paid: 'connect.payout_paid',
  payout_failed: 'connect.payout_failed',
  reconciliation_mismatch: 'reconciliation.mismatch',
}

function nowIso() {
  return new Date().toISOString()
}

function ensureSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }
}

function normalizeObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return {}
}

function normalizeText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function safeJson(value, fallback = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }

  return fallback
}

function hashPayload(payload) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function firstText(...values) {
  for (const value of values) {
    const normalized = normalizeText(value)
    if (normalized) {
      return normalized
    }
  }

  return null
}

function isMissingRecordError(error) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error.code === 'PGRST116' || /no rows|not found/i.test(String(error.message || ''))),
  )
}

function getStripeObject(event) {
  return normalizeObject(event?.data?.object)
}

function getStripeMetadata(eventOrObject) {
  if (!eventOrObject) {
    return {}
  }

  const object = eventOrObject?.data?.object ? getStripeObject(eventOrObject) : normalizeObject(eventOrObject)
  return normalizeObject(object.metadata)
}

function getStripeObjectId(value) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (value && typeof value === 'object' && typeof value.id === 'string' && value.id.trim()) {
    return value.id.trim()
  }

  return null
}

function getAmountFromObject(object, keys) {
  for (const key of keys) {
    const amount = normalizeNumber(object?.[key])
    if (amount !== null) {
      return Math.max(Math.trunc(amount), 0)
    }
  }

  return null
}

function resolveAmountCents(payment, object, keys = ['amount']) {
  const paymentAmount = normalizeNumber(payment?.amount_cents)
  if (paymentAmount !== null) {
    return Math.max(Math.trunc(paymentAmount), 0)
  }

  const amountFromObject = getAmountFromObject(object, keys)
  if (amountFromObject !== null) {
    return amountFromObject
  }

  return 0
}

function getStatusPriority(status, orderMap) {
  const normalized = normalizeText(status)
  if (!normalized) {
    return -1
  }

  const priority = orderMap[normalized]
  return Number.isInteger(priority) ? priority : -1
}

function shouldAdvanceStatus(currentStatus, nextStatus, orderMap) {
  return getStatusPriority(nextStatus, orderMap) >= getStatusPriority(currentStatus, orderMap)
}

function createDomainError(message, statusCode = 400, cause = null) {
  const error = new Error(message)
  error.statusCode = statusCode
  if (cause) {
    error.cause = cause
  }
  return error
}

function isWebhookProcessingStale(eventRow) {
  const receivedAt = new Date(eventRow?.received_at || 0).getTime()

  if (!Number.isFinite(receivedAt) || receivedAt <= 0) {
    return false
  }

  return Date.now() - receivedAt > STALE_WEBHOOK_PROCESSING_MS
}

function getLedgerIdempotencyKey({
  paymentId,
  entryType,
  stripeEventId,
  stripeObjectId,
}) {
  return [
    'ledger',
    paymentId,
    entryType,
    stripeEventId || 'no-event',
    stripeObjectId || 'no-object',
  ].join(':')
}

function getWebhookCorrelationId(event) {
  const object = getStripeObject(event)
  const metadata = getStripeMetadata(object)

  return firstText(metadata.correlation_id, metadata.correlationId, object.correlation_id) || randomUUID()
}

export function ensureStripeWebhookSignatureHeader(signature) {
  const normalized = normalizeText(signature)
  if (!normalized) {
    throw createDomainError('Missing Stripe signature header.', 400)
  }

  return normalized
}

export function ensureIdempotencyKey(value, namespace = 'financial') {
  const normalized = normalizeText(value)
  return normalized || `${namespace}:${randomUUID()}`
}

export function getOrCreateCorrelationId(record = null) {
  if (record && typeof record === 'object') {
    const normalized = firstText(record.correlation_id, record.correlationId)
    if (normalized) {
      return normalized
    }
  }

  return randomUUID()
}

export async function createAuditEvent({
  eventType,
  severity = 'info',
  actorType = 'backend',
  actorProfileId = null,
  entityType,
  entityId,
  beforeState = null,
  afterState = null,
  correlationId = null,
  stripeEventId = null,
  metadata = {},
}) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('audit_events')
    .insert({
      event_type: eventType,
      severity,
      actor_type: actorType,
      actor_profile_id: actorProfileId,
      entity_type: entityType,
      entity_id: String(entityId),
      before_state: beforeState,
      after_state: afterState,
      correlation_id: correlationId,
      stripe_event_id: stripeEventId,
      metadata: safeJson(metadata),
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function createIdempotentAuditEvent(payload) {
  ensureSupabaseAdmin()

  const {
    eventType,
    entityType,
    entityId,
    stripeEventId = null,
    correlationId = null,
    metadata = {},
  } = payload

  let query = supabaseAdmin
    .from('audit_events')
    .select('*')
    .eq('event_type', eventType)
    .eq('entity_type', entityType)
    .eq('entity_id', String(entityId))

  if (stripeEventId) {
    query = query.eq('stripe_event_id', stripeEventId)
  }

  const { data: existing, error: existingError } = await query.maybeSingle()

  if (existingError && !isMissingRecordError(existingError)) {
    throw existingError
  }

  if (existing) {
    return existing
  }

  return createAuditEvent({
    ...payload,
    correlationId,
    metadata: safeJson(metadata),
  })
}

export async function createLedgerEntry(entry) {
  ensureSupabaseAdmin()

  if (!entry?.paymentId) {
    throw createDomainError('Missing paymentId for ledger entry.', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('payment_ledger_entries')
    .insert({
      payment_id: entry.paymentId,
      requester_profile_id: entry.requesterProfileId,
      helper_profile_id: entry.helperProfileId,
      entry_type: entry.entryType,
      direction: entry.direction,
      account_code: entry.accountCode,
      amount_cents: Math.max(Math.trunc(Number(entry.amountCents || 0)), 0),
      platform_fee_cents: Math.max(Math.trunc(Number(entry.platformFeeCents || 0)), 0),
      helper_amount_cents: Math.max(Math.trunc(Number(entry.helperAmountCents || 0)), 0),
      currency: normalizeText(entry.currency) || 'eur',
      stripe_object_type: normalizeText(entry.stripeObjectType),
      stripe_object_id: normalizeText(entry.stripeObjectId),
      source_event_id: entry.sourceEventId ?? null,
      correlation_id: entry.correlationId,
      idempotency_key: ensureIdempotencyKey(entry.idempotencyKey, 'ledger'),
      created_by_system: normalizeText(entry.createdBySystem) || 'stripe-webhook',
      metadata: safeJson(entry.metadata),
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function createIdempotentLedgerEntry(entry) {
  ensureSupabaseAdmin()

  const idempotencyKey = ensureIdempotencyKey(entry.idempotencyKey, 'ledger')

  const { data: inserted, error } = await supabaseAdmin
    .from('payment_ledger_entries')
    .insert({
      payment_id: entry.paymentId,
      requester_profile_id: entry.requesterProfileId,
      helper_profile_id: entry.helperProfileId,
      entry_type: entry.entryType,
      direction: entry.direction,
      account_code: entry.accountCode,
      amount_cents: Math.max(Math.trunc(Number(entry.amountCents || 0)), 0),
      platform_fee_cents: Math.max(Math.trunc(Number(entry.platformFeeCents || 0)), 0),
      helper_amount_cents: Math.max(Math.trunc(Number(entry.helperAmountCents || 0)), 0),
      currency: normalizeText(entry.currency) || 'eur',
      stripe_object_type: normalizeText(entry.stripeObjectType),
      stripe_object_id: normalizeText(entry.stripeObjectId),
      source_event_id: entry.sourceEventId ?? null,
      correlation_id: entry.correlationId,
      idempotency_key: idempotencyKey,
      created_by_system: normalizeText(entry.createdBySystem) || 'stripe-webhook',
      metadata: safeJson(entry.metadata),
    })
    .select('*')
    .single()

  if (!error) {
    return inserted
  }

  if (error.code !== '23505') {
    throw error
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('payment_ledger_entries')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle()

  if (existingError) throw existingError
  return existing
}

async function getExistingWebhookEvent(stripeEventId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('*')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle()

  if (error && !isMissingRecordError(error)) {
    throw error
  }

  return data
}

async function createWebhookEventInboxRow(event) {
  ensureSupabaseAdmin()

  const payloadHash = hashPayload(event)
  const correlationId = getWebhookCorrelationId(event)

  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .insert({
      stripe_event_id: event.id,
      type: event.type,
      livemode: Boolean(event.livemode),
      stripe_account_id: normalizeText(event.account),
      payload: event,
      payload_hash: payloadHash,
      processing_status: 'received',
      processing_attempts: 0,
      received_at: nowIso(),
      correlation_id: correlationId,
    })
    .select('*')
    .single()

  if (!error) {
    return { eventRow: data, duplicate: false }
  }

  if (error.code !== '23505') {
    throw error
  }

  const existing = await getExistingWebhookEvent(event.id)
  if (!existing) {
    throw createDomainError(`Webhook event ${event.id} already exists but could not be loaded.`, 500)
  }

  return { eventRow: existing, duplicate: true }
}

async function updateWebhookEventRow(eventRowId, updates) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      ...updates,
      processed_at: updates.processing_status === 'processed'
        ? updates.processed_at || nowIso()
        : updates.processed_at ?? null,
    })
    .eq('id', eventRowId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

async function markWebhookProcessing(eventRow) {
  return updateWebhookEventRow(eventRow.id, {
    processing_status: 'processing',
    processing_attempts: (eventRow.processing_attempts || 0) + 1,
    error_message: null,
  })
}

export async function markWebhookProcessed(eventRow, metadata = {}) {
  return updateWebhookEventRow(eventRow.id, {
    processing_status: 'processed',
    processing_attempts: eventRow.processing_attempts || 0,
    error_message: null,
    correlation_id: metadata.correlationId || eventRow.correlation_id || null,
  })
}

export async function markWebhookFailed(eventRow, error, metadata = {}) {
  return updateWebhookEventRow(eventRow.id, {
    processing_status: 'failed',
    processing_attempts: eventRow.processing_attempts || 0,
    error_message: normalizeText(error?.message) || 'Webhook processing failed.',
    correlation_id: metadata.correlationId || eventRow.correlation_id || null,
  })
}

async function maybeRefreshStripeObject(event, object) {
  const currentObject = normalizeObject(object)
  const objectId = getStripeObjectId(currentObject)

  if (!objectId) {
    return currentObject
  }

  try {
    if (event.type === 'checkout.session.completed') {
      return await stripe.checkout.sessions.retrieve(objectId, { expand: ['payment_intent'] })
    }

    if (event.type.startsWith('payment_intent.')) {
      return await stripe.paymentIntents.retrieve(objectId, { expand: ['latest_charge'] })
    }

    if (event.type === 'charge.refunded') {
      return await stripe.charges.retrieve(objectId, { expand: ['refunds'] })
    }

    if (event.type.startsWith('charge.dispute.')) {
      return await stripe.disputes.retrieve(objectId, { expand: ['charge'] })
    }

    if (event.type.startsWith('transfer.')) {
      return await stripe.transfers.retrieve(objectId)
    }

    if (event.type.startsWith('payout.')) {
      return await stripe.payouts.retrieve(objectId)
    }
  } catch {
    return currentObject
  }

  return currentObject
}

async function findPaymentByColumn(column, value) {
  ensureSupabaseAdmin()

  const normalized = normalizeText(value)
  if (!normalized) {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq(column, normalized)
    .maybeSingle()

  if (error && !isMissingRecordError(error)) {
    throw error
  }

  return data || null
}

async function resolvePaymentFromEvent(event, object) {
  const metadata = getStripeMetadata(object)
  const paymentId = firstText(metadata.payment_id, metadata.paymentId)
  if (paymentId) {
    const payment = await findPaymentByColumn('id', paymentId)
    if (payment) {
      return payment
    }
  }

  const taskId = firstText(metadata.task_id, metadata.taskId)
  if (taskId) {
    const payment = await findPaymentByColumn('task_id', taskId)
    if (payment) {
      return payment
    }
  }

  const paymentIntentId =
    event.type === 'checkout.session.completed'
      ? getStripeObjectId(object.payment_intent)
      : getStripeObjectId(object)

  if (paymentIntentId) {
    const payment = await findPaymentByColumn('stripe_payment_intent_id', paymentIntentId)
    if (payment) {
      return payment
    }
  }

  const checkoutSessionId = event.type === 'checkout.session.completed' ? getStripeObjectId(object) : null
  if (checkoutSessionId) {
    const payment = await findPaymentByColumn('stripe_checkout_session_id', checkoutSessionId)
    if (payment) {
      return payment
    }
  }

  const chargeId = firstText(
    getStripeObjectId(object.latest_charge),
    event.type === 'charge.refunded' ? getStripeObjectId(object) : null,
    event.type.startsWith('charge.dispute.') ? getStripeObjectId(object.charge) : null,
    event.type.startsWith('transfer.') ? getStripeObjectId(object.source_transaction) : null,
  )

  if (chargeId) {
    const payment = await findPaymentByColumn('stripe_charge_id', chargeId)
    if (payment) {
      return payment
    }
  }

  return null
}

function getCorrelationIdForPayment(payment, eventRow, object) {
  return firstText(
    payment?.correlation_id,
    eventRow?.correlation_id,
    getStripeMetadata(object).correlation_id,
    getStripeMetadata(object).correlationId,
    randomUUID(),
  )
}

async function updatePaymentRow(paymentId, updates) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update({
      ...updates,
      updated_at: nowIso(),
    })
    .eq('id', paymentId)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

async function updatePaymentReconciliation(payment, reason, metadata = {}) {
  return updatePaymentRow(payment.id, {
    reconciliation_status: 'needs_review',
    reconciliation_error: normalizeText(reason) || 'Stripe reconciliation mismatch.',
    last_reconciled_at: nowIso(),
    metadata: {
      ...(safeJson(payment.metadata)),
      reconciliation: {
        reason: normalizeText(reason) || 'Stripe reconciliation mismatch.',
        ...safeJson(metadata),
      },
    },
  })
}

async function markFinancialMismatch({
  entityType,
  entityId,
  reason,
  metadata = {},
  payment = null,
  eventRow = null,
  stripeEventId = null,
  correlationId = null,
}) {
  const resolvedCorrelationId = correlationId || eventRow?.correlation_id || payment?.correlation_id || randomUUID()

  await createIdempotentAuditEvent({
    eventType: 'reconciliation_mismatch',
    severity: 'warning',
    actorType: 'stripe',
    entityType,
    entityId,
    correlationId: resolvedCorrelationId,
    stripeEventId,
    metadata: {
      reason,
      ...safeJson(metadata),
    },
  })

  if (payment) {
    await updatePaymentReconciliation(payment, reason, metadata)

    await createIdempotentLedgerEntry({
      paymentId: payment.id,
      requesterProfileId: payment.requester_profile_id,
      helperProfileId: payment.helper_profile_id,
      entryType: 'reconciliation_mismatch',
      direction: 'debit',
      accountCode: LEDGER_ACCOUNT_CODES.reconciliation_mismatch,
      amountCents: resolveAmountCents(payment, {}, ['amount_cents']),
      platformFeeCents: normalizeNumber(payment.platform_fee_cents) || 0,
      helperAmountCents: normalizeNumber(payment.helper_amount_cents) || 0,
      currency: payment.currency || 'eur',
      stripeObjectType: entityType,
      stripeObjectId: String(entityId),
      sourceEventId: eventRow?.id ?? null,
      correlationId: resolvedCorrelationId,
      idempotencyKey: getLedgerIdempotencyKey({
        paymentId: payment.id,
        entryType: 'reconciliation_mismatch',
        stripeEventId,
        stripeObjectId: entityId,
      }),
      createdBySystem: 'stripe-webhook',
      metadata: {
        reason,
        ...safeJson(metadata),
      },
    })
  }

  return {
    mismatch: true,
    correlationId: resolvedCorrelationId,
  }
}

async function maybeCreatePaymentLedgerEntries({
  payment,
  event,
  eventRow,
  entries,
}) {
  const object = getStripeObject(event)
  const correlationId = getCorrelationIdForPayment(payment, eventRow, object)
  const results = []

  for (const entry of entries) {
    results.push(
      await createIdempotentLedgerEntry({
        paymentId: payment.id,
        requesterProfileId: payment.requester_profile_id,
        helperProfileId: payment.helper_profile_id,
        entryType: entry.entryType,
        direction: entry.direction,
        accountCode: entry.accountCode,
        amountCents: entry.amountCents,
        platformFeeCents: entry.platformFeeCents ?? payment.platform_fee_cents ?? 0,
        helperAmountCents: entry.helperAmountCents ?? payment.helper_amount_cents ?? 0,
        currency: payment.currency || 'eur',
        stripeObjectType: entry.stripeObjectType || event.type,
        stripeObjectId: entry.stripeObjectId || object.id || null,
        sourceEventId: eventRow.id,
        correlationId,
        idempotencyKey: entry.idempotencyKey || getLedgerIdempotencyKey({
          paymentId: payment.id,
          entryType: entry.entryType,
          stripeEventId: event.id,
          stripeObjectId: entry.stripeObjectId || object.id || null,
        }),
        createdBySystem: 'stripe-webhook',
        metadata: {
          event_type: event.type,
          stripe_event_id: event.id,
          ...safeJson(entry.metadata),
        },
      }),
    )
  }

  return results
}

async function maybeCreateWebHookAudit({
  eventType,
  event,
  entityType,
  entityId,
  beforeState = null,
  afterState = null,
  severity = 'info',
  metadata = {},
  correlationId = null,
}) {
  return createIdempotentAuditEvent({
    eventType,
    severity,
    actorType: 'stripe',
    entityType,
    entityId,
    beforeState,
    afterState,
    correlationId: correlationId || getWebhookCorrelationId(event),
    stripeEventId: event.id,
    metadata: {
      event_type: event.type,
      ...safeJson(metadata),
    },
  })
}

async function mirrorRefund(payment, event, object, eventRow) {
  const chargeId = getStripeObjectId(object)
  const latestRefundId = getStripeObjectId(object?.refunds?.data?.[0])
  const amountCents = resolveAmountCents(payment, object, ['amount_refunded', 'amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, object)

  const { error: refundError } = await supabaseAdmin
    .from('refunds')
    .upsert({
      payment_id: payment.id,
      requester_profile_id: payment.requester_profile_id,
      helper_profile_id: payment.helper_profile_id,
      stripe_refund_id: latestRefundId,
      charge_id: chargeId,
      amount_cents: amountCents,
      currency: payment.currency || 'eur',
      status: 'succeeded',
      reason: normalizeText(object.reason) || null,
      failure_code: null,
      metadata: {
        event_id: event.id,
        partial: Boolean(normalizeNumber(object.amount_refunded) !== null && normalizeNumber(object.amount) !== null && normalizeNumber(object.amount_refunded) < normalizeNumber(object.amount)),
      },
      updated_at: nowIso(),
      created_at: nowIso(),
    }, {
      onConflict: 'payment_id',
    })
    .select('*')
    .single()

  if (refundError) throw refundError

  return createIdempotentLedgerEntry({
    paymentId: payment.id,
    requesterProfileId: payment.requester_profile_id,
    helperProfileId: payment.helper_profile_id,
    entryType: 'refund_succeeded',
    direction: 'debit',
    accountCode: LEDGER_ACCOUNT_CODES.refund_succeeded,
    amountCents,
    platformFeeCents: payment.platform_fee_cents || 0,
    helperAmountCents: payment.helper_amount_cents || 0,
    currency: payment.currency || 'eur',
    stripeObjectType: event.type,
    stripeObjectId: chargeId,
    sourceEventId: eventRow.id,
    correlationId,
    idempotencyKey: getLedgerIdempotencyKey({
      paymentId: payment.id,
      entryType: 'refund_succeeded',
      stripeEventId: event.id,
      stripeObjectId: chargeId,
    }),
    createdBySystem: 'stripe-webhook',
    metadata: {
      event_type: event.type,
      stripe_event_id: event.id,
      refund_id: latestRefundId,
      partial: Boolean(normalizeNumber(object.amount_refunded) !== null && normalizeNumber(object.amount) !== null && normalizeNumber(object.amount_refunded) < normalizeNumber(object.amount)),
    },
  })
}

async function mirrorDispute(payment, event, object, eventRow, status) {
  const chargeId = getStripeObjectId(object.charge)
  const amountCents = resolveAmountCents(payment, object, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, object)

  const { error: disputeError } = await supabaseAdmin
    .from('disputes')
    .upsert({
      payment_id: payment.id,
      requester_profile_id: payment.requester_profile_id,
      helper_profile_id: payment.helper_profile_id,
      stripe_dispute_id: getStripeObjectId(object),
      charge_id: chargeId,
      amount_cents: amountCents,
      currency: payment.currency || 'eur',
      status,
      reason: normalizeText(object.reason) || null,
      evidence_due_by: object.evidence_due_by ? new Date(object.evidence_due_by * 1000).toISOString() : null,
      has_evidence: Boolean(object.evidence_details || object.evidence),
      outcome: normalizeText(object.status) || null,
      metadata: {
        event_id: event.id,
        event_type: event.type,
      },
      updated_at: nowIso(),
      created_at: nowIso(),
    }, {
      onConflict: 'stripe_dispute_id',
    })
    .select('*')
    .single()

  if (disputeError) throw disputeError

  return createIdempotentLedgerEntry({
    paymentId: payment.id,
    requesterProfileId: payment.requester_profile_id,
    helperProfileId: payment.helper_profile_id,
    entryType:
      status === 'closed'
        ? 'dispute_closed'
        : status === 'opened'
          ? 'dispute_opened'
          : 'dispute_updated',
    direction: 'debit',
    accountCode:
      status === 'closed'
        ? LEDGER_ACCOUNT_CODES.dispute_closed
        : status === 'opened'
          ? LEDGER_ACCOUNT_CODES.dispute_opened
          : LEDGER_ACCOUNT_CODES.dispute_updated,
    amountCents,
    platformFeeCents: payment.platform_fee_cents || 0,
    helperAmountCents: payment.helper_amount_cents || 0,
    currency: payment.currency || 'eur',
    stripeObjectType: event.type,
    stripeObjectId: getStripeObjectId(object),
    sourceEventId: eventRow.id,
    correlationId,
    idempotencyKey: getLedgerIdempotencyKey({
      paymentId: payment.id,
      entryType:
        status === 'closed'
          ? 'dispute_closed'
          : status === 'opened'
            ? 'dispute_opened'
            : 'dispute_updated',
      stripeEventId: event.id,
      stripeObjectId: getStripeObjectId(object),
    }),
    createdBySystem: 'stripe-webhook',
    metadata: {
      event_type: event.type,
      stripe_event_id: event.id,
      status,
    },
  })
}

async function mirrorTransfer(payment, event, object, eventRow, status) {
  const transferId = getStripeObjectId(object)
  const amountCents = resolveAmountCents(payment, object, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, object)
  const idempotencyKey = ensureIdempotencyKey(
    `transfer:${payment.id}:${transferId || event.id}:${event.id}`,
    'transfer',
  )

  const { error: transferError } = await supabaseAdmin
    .from('transfers')
    .upsert({
      payment_id: payment.id,
      requester_profile_id: payment.requester_profile_id,
      helper_profile_id: payment.helper_profile_id,
      connect_account_profile_id: payment.helper_profile_id,
      stripe_transfer_id: transferId,
      stripe_balance_transaction_id: getStripeObjectId(object.balance_transaction),
      amount_cents: amountCents,
      currency: payment.currency || 'eur',
      status,
      failure_code: normalizeText(object.failure_code) || null,
      reversed_at: status === 'reversed' ? nowIso() : null,
      correlation_id: payment.correlation_id || correlationId,
      idempotency_key: idempotencyKey,
      metadata: {
        event_id: event.id,
        event_type: event.type,
      },
      updated_at: nowIso(),
    }, {
      onConflict: 'payment_id',
    })
    .select('*')
    .single()

  if (transferError) throw transferError

  return createIdempotentLedgerEntry({
    paymentId: payment.id,
    requesterProfileId: payment.requester_profile_id,
    helperProfileId: payment.helper_profile_id,
    entryType:
      status === 'paid'
        ? 'transfer_paid'
        : status === 'failed'
          ? 'transfer_failed'
          : status === 'reversed'
            ? 'transfer_reversed'
            : 'transfer_created',
    direction: 'debit',
    accountCode:
      status === 'paid'
        ? LEDGER_ACCOUNT_CODES.transfer_paid
        : status === 'failed'
          ? LEDGER_ACCOUNT_CODES.transfer_failed
          : status === 'reversed'
            ? LEDGER_ACCOUNT_CODES.transfer_reversed
            : LEDGER_ACCOUNT_CODES.transfer_created,
    amountCents,
    platformFeeCents: payment.platform_fee_cents || 0,
    helperAmountCents: payment.helper_amount_cents || 0,
    currency: payment.currency || 'eur',
    stripeObjectType: event.type,
    stripeObjectId: transferId,
    sourceEventId: eventRow.id,
    correlationId,
    idempotencyKey: getLedgerIdempotencyKey({
      paymentId: payment.id,
      entryType:
        status === 'paid'
          ? 'transfer_paid'
          : status === 'failed'
            ? 'transfer_failed'
            : status === 'reversed'
              ? 'transfer_reversed'
              : 'transfer_created',
      stripeEventId: event.id,
      stripeObjectId: transferId,
    }),
    createdBySystem: 'stripe-webhook',
    metadata: {
      event_type: event.type,
      stripe_event_id: event.id,
      status,
    },
  })
}

async function mirrorPayout(payment, event, object, eventRow, status) {
  const payoutId = getStripeObjectId(object)
  const amountCents = resolveAmountCents(payment, object, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, object)

  const { error: payoutError } = await supabaseAdmin
    .from('payouts')
    .upsert({
      payment_id: payment.id,
      transfer_id: null,
      requester_profile_id: payment.requester_profile_id,
      helper_profile_id: payment.helper_profile_id,
      connect_account_profile_id: payment.helper_profile_id,
      stripe_payout_id: payoutId,
      stripe_balance_transaction_id: getStripeObjectId(object.balance_transaction),
      amount_cents: amountCents,
      currency: payment.currency || 'eur',
      arrival_date: object.arrival_date ? new Date(object.arrival_date * 1000).toISOString().slice(0, 10) : null,
      status,
      failure_code: normalizeText(object.failure_code) || null,
      metadata: {
        event_id: event.id,
        event_type: event.type,
      },
      updated_at: nowIso(),
      created_at: nowIso(),
    }, {
      onConflict: 'stripe_payout_id',
    })
    .select('*')
    .single()

  if (payoutError) throw payoutError

  return createIdempotentLedgerEntry({
    paymentId: payment.id,
    requesterProfileId: payment.requester_profile_id,
    helperProfileId: payment.helper_profile_id,
    entryType: status === 'paid' ? 'payout_paid' : 'payout_failed',
    direction: 'debit',
    accountCode: status === 'paid' ? LEDGER_ACCOUNT_CODES.payout_paid : LEDGER_ACCOUNT_CODES.payout_failed,
    amountCents,
    platformFeeCents: payment.platform_fee_cents || 0,
    helperAmountCents: payment.helper_amount_cents || 0,
    currency: payment.currency || 'eur',
    stripeObjectType: event.type,
    stripeObjectId: payoutId,
    sourceEventId: eventRow.id,
    correlationId,
    idempotencyKey: getLedgerIdempotencyKey({
      paymentId: payment.id,
      entryType: status === 'paid' ? 'payout_paid' : 'payout_failed',
      stripeEventId: event.id,
      stripeObjectId: payoutId,
    }),
    createdBySystem: 'stripe-webhook',
    metadata: {
      event_type: event.type,
      stripe_event_id: event.id,
      status,
    },
  })
}

async function handleConnectAccountUpdated(event, eventRow, object) {
  const syncedProfile = await syncStripeAccountFromWebhook(object)

  if (!syncedProfile?.id) {
    await markFinancialMismatch({
      entityType: 'connect_account',
      entityId: getStripeObjectId(object),
      reason: 'Stripe Connect account could not be matched to a local profile.',
      metadata: {
        stripe_account_id: getStripeObjectId(object),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const audit = await createIdempotentAuditEvent({
    eventType: 'connect_account_synced',
    severity: 'info',
    actorType: 'stripe',
    entityType: 'connect_account',
    entityId: getStripeObjectId(object),
    afterState: {
      profile_id: syncedProfile.id,
      charges_enabled: Boolean(object.charges_enabled),
      payouts_enabled: Boolean(object.payouts_enabled),
      details_submitted: Boolean(object.details_submitted),
    },
    correlationId: eventRow.correlation_id || getWebhookCorrelationId(event),
    stripeEventId: event.id,
    metadata: {
      stripe_account_id: getStripeObjectId(object),
      profile_id: syncedProfile.id,
    },
  })

  return {
    audit,
    mismatch: false,
  }
}

async function handleCheckoutSessionCompleted(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'Checkout session completed without a matching local payment.',
      metadata: {
        checkout_session_id: getStripeObjectId(enrichedObject),
        payment_intent_id: getStripeObjectId(enrichedObject.payment_intent),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount_total', 'amount_subtotal', 'amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const canAdvance = !PAYMENT_STATUS_BLOCKING.has(normalizeText(payment.status) || '')

  await updatePaymentRow(payment.id, {
    stripe_checkout_session_id: getStripeObjectId(enrichedObject),
    stripe_checkout_session_status: normalizeText(enrichedObject.payment_status || enrichedObject.status),
    stripe_payment_intent_id: getStripeObjectId(enrichedObject.payment_intent) || payment.stripe_payment_intent_id,
    correlation_id: payment.correlation_id || correlationId,
    reconciliation_status: canAdvance ? 'reconciled' : 'needs_review',
    reconciliation_error: canAdvance ? null : 'Checkout session completed after a later local payment state.',
    last_reconciled_at: nowIso(),
    status: canAdvance ? 'processing' : payment.status,
  })

  await maybeCreatePaymentLedgerEntries({
    payment,
    event,
    eventRow,
    entries: [
      {
        entryType: 'checkout_completed',
        direction: 'credit',
        accountCode: LEDGER_ACCOUNT_CODES.checkout_completed,
        amountCents,
        stripeObjectType: 'checkout.session',
        stripeObjectId: getStripeObjectId(enrichedObject),
      },
    ],
  })

  await maybeCreateWebHookAudit({
    eventType: 'checkout_session_completed',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      checkout_session_id: getStripeObjectId(enrichedObject),
      payment_intent_id: getStripeObjectId(enrichedObject.payment_intent),
      amount_cents: amountCents,
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'Checkout session completed after a later payment state was already stored locally.',
      metadata: {
        checkout_session_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance,
  }
}

async function promoteTaskToInProgress({ payment, event, eventRow, enrichedObject, correlationId, canAdvance }) {
  if (!payment?.task_id) {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: payment?.id || event.id,
      reason: 'PaymentIntent succeeded without a task relation.',
      metadata: {
        payment_id: payment?.id || null,
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      mismatch: true,
      promoted: false,
    }
  }

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('id, created_by, accepted_by, status, updated_at, modified_at')
    .eq('id', payment.task_id)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!task) {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: payment.task_id,
      reason: 'PaymentIntent succeeded without a matching local task.',
      metadata: {
        payment_id: payment.id,
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      mismatch: true,
      promoted: false,
    }
  }

  const isMatchingTask =
    task.created_by === payment.requester_profile_id &&
    task.accepted_by === payment.helper_profile_id

  if (!canAdvance || !isMatchingTask || task.status !== 'assigned') {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: task.id,
      reason: 'PaymentIntent succeeded but the related task was not eligible for in_progress.',
      metadata: {
        payment_id: payment.id,
        task_status: task.status,
        task_created_by: task.created_by,
        task_accepted_by: task.accepted_by,
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      mismatch: true,
      promoted: false,
    }
  }

  const { data: updatedTask, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'in_progress',
      modified_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq('id', task.id)
    .eq('created_by', payment.requester_profile_id)
    .eq('accepted_by', payment.helper_profile_id)
    .eq('status', 'assigned')
    .select('id, created_by, accepted_by, status')
    .maybeSingle()

  if (updateError) {
    throw updateError
  }

  if (!updatedTask) {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: task.id,
      reason: 'PaymentIntent succeeded but the task could not transition to in_progress.',
      metadata: {
        payment_id: payment.id,
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      mismatch: true,
      promoted: false,
    }
  }

  await createIdempotentAuditEvent({
    eventType: 'task_moved_to_in_progress',
    severity: 'info',
    actorType: 'stripe',
    entityType: 'task',
    entityId: updatedTask.id,
    beforeState: {
      status: task.status,
      accepted_by: task.accepted_by,
    },
    afterState: {
      status: 'in_progress',
      accepted_by: updatedTask.accepted_by,
    },
    correlationId,
    stripeEventId: event.id,
    metadata: {
      payment_id: payment.id,
      payment_intent_id: getStripeObjectId(enrichedObject),
    },
  })

  return {
    mismatch: false,
    promoted: true,
  }
}

async function handlePaymentIntentSucceeded(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'PaymentIntent succeeded without a matching local payment.',
      metadata: {
        payment_intent_id: getStripeObjectId(enrichedObject),
        charge_id: getStripeObjectId(enrichedObject.latest_charge),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const chargeId = getStripeObjectId(enrichedObject.latest_charge)
  const balanceTransactionId = getStripeObjectId(enrichedObject.latest_charge?.balance_transaction)
  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const canAdvance = PAYMENT_STATUS_BLOCKING.has(normalizeText(payment.status) || '') === false

  await updatePaymentRow(payment.id, {
    stripe_payment_intent_id: getStripeObjectId(enrichedObject),
    stripe_charge_id: chargeId || payment.stripe_charge_id,
    stripe_balance_transaction_id: balanceTransactionId || payment.stripe_balance_transaction_id,
    captured_at: payment.captured_at || nowIso(),
    held_at: payment.held_at || nowIso(),
    correlation_id: payment.correlation_id || correlationId,
    reconciliation_status: canAdvance ? 'reconciled' : 'needs_review',
    reconciliation_error: canAdvance ? null : 'PaymentIntent succeeded after a later local payment state.',
    last_reconciled_at: nowIso(),
    status: canAdvance ? 'held' : payment.status,
  })

  const taskResult = await promoteTaskToInProgress({
    payment,
    event,
    eventRow,
    enrichedObject,
    correlationId,
    canAdvance,
  })

  await maybeCreatePaymentLedgerEntries({
    payment,
    event,
    eventRow,
    entries: [
      {
        entryType: 'charge_captured',
        direction: 'credit',
        accountCode: LEDGER_ACCOUNT_CODES.charge_captured,
        amountCents,
        stripeObjectType: 'payment_intent',
        stripeObjectId: getStripeObjectId(enrichedObject),
      },
      {
        entryType: 'funds_held',
        direction: 'credit',
        accountCode: LEDGER_ACCOUNT_CODES.funds_held,
        amountCents,
        stripeObjectType: 'payment_intent',
        stripeObjectId: getStripeObjectId(enrichedObject),
      },
    ],
  })

  await maybeCreateWebHookAudit({
    eventType: 'payment_intent_succeeded',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      payment_intent_id: getStripeObjectId(enrichedObject),
      charge_id: chargeId,
      balance_transaction_id: balanceTransactionId,
      amount_cents: amountCents,
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'PaymentIntent succeeded after a later local payment state was already stored.',
      metadata: {
        payment_intent_id: getStripeObjectId(enrichedObject),
        charge_id: chargeId,
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance || taskResult.mismatch,
  }
}

async function handlePaymentIntentFailed(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'PaymentIntent failed without a matching local payment.',
      metadata: {
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const canAdvance = PAYMENT_STATUS_FAILED_APPLICABLE.has(normalizeText(payment.status) || '')

  await updatePaymentRow(payment.id, {
    stripe_payment_intent_id: getStripeObjectId(enrichedObject),
    stripe_charge_id: getStripeObjectId(enrichedObject.latest_charge) || payment.stripe_charge_id,
    correlation_id: payment.correlation_id || correlationId,
    reconciliation_status: canAdvance ? 'reconciled' : 'needs_review',
    reconciliation_error: canAdvance ? null : 'PaymentIntent failed after a later local payment state.',
    last_reconciled_at: nowIso(),
    status: canAdvance ? 'failed' : payment.status,
  })

  await maybeCreatePaymentLedgerEntries({
    payment,
    event,
    eventRow,
    entries: [
      {
        entryType: 'payment_failed',
        direction: 'debit',
        accountCode: LEDGER_ACCOUNT_CODES.payment_failed,
        amountCents,
        stripeObjectType: 'payment_intent',
        stripeObjectId: getStripeObjectId(enrichedObject),
      },
    ],
  })

  await maybeCreateWebHookAudit({
    eventType: 'payment_intent_payment_failed',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      payment_intent_id: getStripeObjectId(enrichedObject),
      charge_id: getStripeObjectId(enrichedObject.latest_charge),
      amount_cents: amountCents,
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'PaymentIntent failed after a later local payment state was already stored.',
      metadata: {
        payment_intent_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance,
  }
}

async function handleChargeRefunded(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'Charge refunded without a matching local payment.',
      metadata: {
        charge_id: getStripeObjectId(enrichedObject),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount_refunded', 'amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const canAdvance = PAYMENT_STATUS_REFUND_APPLICABLE.has(normalizeText(payment.status) || '')

  await updatePaymentRow(payment.id, {
    stripe_charge_id: getStripeObjectId(enrichedObject) || payment.stripe_charge_id,
    refunded_at: nowIso(),
    correlation_id: payment.correlation_id || correlationId,
    reconciliation_status: canAdvance ? 'reconciled' : 'needs_review',
    reconciliation_error: canAdvance ? null : 'Charge refunded after a later local payment state.',
    last_reconciled_at: nowIso(),
    status: canAdvance ? 'refunded' : payment.status,
  })

  await mirrorRefund(payment, event, enrichedObject, eventRow)

  await maybeCreateWebHookAudit({
    eventType: 'refund_succeeded',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      charge_id: getStripeObjectId(enrichedObject),
      amount_cents: amountCents,
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'Charge refunded after a later local payment state was already stored.',
      metadata: {
        charge_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance,
  }
}

function getDisputeStatusForEvent(eventType, object) {
  if (eventType === 'charge.dispute.created') {
    return 'opened'
  }

  if (eventType === 'charge.dispute.updated') {
    return normalizeText(object.status) || 'under_review'
  }

  if (eventType === 'charge.dispute.closed') {
    return normalizeText(object.status) || 'closed'
  }

  return 'opened'
}

async function handleDisputeEvent(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)
  const status = getDisputeStatusForEvent(event.type, enrichedObject)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'Dispute event without a matching local payment.',
      metadata: {
        dispute_id: getStripeObjectId(enrichedObject),
        charge_id: getStripeObjectId(enrichedObject.charge),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount'])
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const canAdvance = PAYMENT_STATUS_DISPUTE_APPLICABLE.has(normalizeText(payment.status) || '') || normalizeText(payment.status) === 'disputed'
  const currentDispute = await supabaseAdmin
    .from('disputes')
    .select('*')
    .eq('stripe_dispute_id', getStripeObjectId(enrichedObject))
    .maybeSingle()

  if (currentDispute?.error && !isMissingRecordError(currentDispute.error)) {
    throw currentDispute.error
  }

  const storedDisputeStatus = canAdvance ? status : currentDispute?.data?.status || status

  await updatePaymentRow(payment.id, {
    disputed_at: nowIso(),
    correlation_id: payment.correlation_id || correlationId,
    reconciliation_status: canAdvance ? 'needs_review' : 'needs_review',
    reconciliation_error: 'Dispute event received from Stripe.',
    last_reconciled_at: nowIso(),
    status: canAdvance ? 'disputed' : payment.status,
  })

  await mirrorDispute(payment, event, enrichedObject, eventRow, storedDisputeStatus)

  await maybeCreateWebHookAudit({
    eventType:
      event.type === 'charge.dispute.created'
        ? 'dispute_opened'
        : event.type === 'charge.dispute.updated'
          ? 'dispute_updated'
          : 'dispute_closed',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      dispute_id: getStripeObjectId(enrichedObject),
      charge_id: getStripeObjectId(enrichedObject.charge),
      amount_cents: amountCents,
      status,
    },
    severity: 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  return {
    paymentId: payment.id,
    mismatch: false,
  }
}

function getTransferStatusForEvent(eventType) {
  if (eventType === 'transfer.created') return 'pending'
  if (eventType === 'transfer.paid') return 'paid'
  if (eventType === 'transfer.failed') return 'failed'
  if (eventType === 'transfer.reversed') return 'reversed'
  return 'pending'
}

function canAdvanceTransferStatus(currentStatus, nextStatus) {
  const normalizedCurrent = normalizeText(currentStatus)
  const normalizedNext = normalizeText(nextStatus)

  if (!normalizedNext) return false
  if (!normalizedCurrent) return true
  if (normalizedCurrent === normalizedNext) return false
  if (normalizedCurrent === 'reversed') return false
  if (normalizedCurrent === 'paid') return normalizedNext === 'reversed'
  if (normalizedCurrent === 'failed') return false

  if (normalizedCurrent === 'draft' || normalizedCurrent === 'queued' || normalizedCurrent === 'pending') {
    return ['pending', 'paid', 'failed', 'reversed'].includes(normalizedNext)
  }

  return false
}

function canAdvancePayoutStatus(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return false
  if (currentStatus === 'canceled') return false
  if (currentStatus === 'paid') return false
  return shouldAdvanceStatus(currentStatus, nextStatus, PAYOUT_STATUS_ORDER)
}

async function closeTaskAfterTransferPaid(payment, event, eventRow, object, correlationId) {
  if (!payment?.task_id) {
    return {
      closed: false,
      mismatch: true,
    }
  }

  const { data: task, error } = await supabaseAdmin
    .from('tasks')
    .select('id, created_by, accepted_by, status, updated_at, modified_at, completed_at')
    .eq('id', payment.task_id)
    .maybeSingle()

  if (error && !isMissingRecordError(error)) {
    throw error
  }

  if (!task) {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: payment.task_id,
      reason: 'Transfer paid without a matching local task.',
      metadata: {
        payment_id: payment.id,
        transfer_id: getStripeObjectId(object),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      closed: false,
      mismatch: true,
    }
  }

  const isMatchingTask =
    task.created_by === payment.requester_profile_id &&
    task.accepted_by === payment.helper_profile_id

  if (task.status === 'closed' && isMatchingTask) {
    return {
      closed: true,
      mismatch: false,
    }
  }

  if (!isMatchingTask || task.status !== 'completed') {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: task.id,
      reason: 'Transfer paid but the task was not eligible for closing.',
      metadata: {
        payment_id: payment.id,
        task_status: task.status,
        task_created_by: task.created_by,
        task_accepted_by: task.accepted_by,
        transfer_id: getStripeObjectId(object),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      closed: false,
      mismatch: true,
    }
  }

  const { data: closedTask, error: updateError } = await supabaseAdmin
    .from('tasks')
    .update({
      status: 'closed',
      updated_at: nowIso(),
    })
    .eq('id', task.id)
    .eq('created_by', payment.requester_profile_id)
    .eq('accepted_by', payment.helper_profile_id)
    .eq('status', 'completed')
    .select('id, status, created_by, accepted_by')
    .maybeSingle()

  if (updateError) {
    throw updateError
  }

  if (!closedTask) {
    await markFinancialMismatch({
      entityType: 'task',
      entityId: task.id,
      reason: 'Transfer paid but the task could not be closed.',
      metadata: {
        payment_id: payment.id,
        transfer_id: getStripeObjectId(object),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      closed: false,
      mismatch: true,
    }
  }

  await createIdempotentAuditEvent({
    eventType: 'task_closed_after_transfer_paid',
    severity: 'info',
    actorType: 'stripe',
    entityType: 'task',
    entityId: task.id,
    beforeState: {
      status: task.status,
    },
    afterState: {
      status: 'closed',
    },
    correlationId,
    stripeEventId: event.id,
    metadata: {
      payment_id: payment.id,
      transfer_id: getStripeObjectId(object),
    },
  })

  return {
    closed: true,
    mismatch: false,
  }
}

async function handleTransferEvent(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)
  const nextStatus = getTransferStatusForEvent(event.type)

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'Transfer event without a matching local payment.',
      metadata: {
        transfer_id: getStripeObjectId(enrichedObject),
        source_transaction: getStripeObjectId(enrichedObject.source_transaction),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const currentTransfer = await supabaseAdmin
    .from('transfers')
    .select('*')
    .eq('payment_id', payment.id)
    .maybeSingle()

  if (currentTransfer?.error && !isMissingRecordError(currentTransfer.error)) {
    throw currentTransfer.error
  }

  const existingTransfer = currentTransfer?.data || null
  const isDuplicateStatus = Boolean(existingTransfer && existingTransfer.status === nextStatus)
  const canAdvance = !existingTransfer || canAdvanceTransferStatus(existingTransfer.status, nextStatus) || isDuplicateStatus
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount'])
  const storedTransferStatus = canAdvance ? nextStatus : existingTransfer?.status || nextStatus

  if (!canAdvance) {
    await maybeCreateWebHookAudit({
      eventType:
        event.type === 'transfer.created'
          ? 'transfer_created'
          : event.type === 'transfer.paid'
            ? 'transfer_paid'
            : event.type === 'transfer.failed'
              ? 'transfer_failed'
              : 'transfer_reversed',
      event,
      entityType: 'payment',
      entityId: payment.id,
      afterState: {
        transfer_id: getStripeObjectId(enrichedObject),
        amount_cents: amountCents,
        status: nextStatus,
        payment_status: payment.status,
        task_closed: false,
      },
      severity: 'warning',
      metadata: {
        payment_id: payment.id,
      },
      correlationId,
    })

    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'Transfer event arrived out of order or after a later local transfer state.',
      metadata: {
        transfer_id: getStripeObjectId(enrichedObject),
        source_transaction: getStripeObjectId(enrichedObject.source_transaction),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    return {
      paymentId: payment.id,
      mismatch: true,
    }
  }

  await mirrorTransfer(payment, event, enrichedObject, eventRow, storedTransferStatus)

  const paymentStatus = normalizeText(payment.status) || ''
  const paymentUpdates = {
    stripe_transfer_id: getStripeObjectId(enrichedObject) || payment.stripe_transfer_id,
    stripe_balance_transaction_id:
      getStripeObjectId(enrichedObject.balance_transaction) || payment.stripe_balance_transaction_id,
    correlation_id: payment.correlation_id || correlationId,
    last_reconciled_at: nowIso(),
    reconciliation_status: canAdvance ? 'reconciled' : 'needs_review',
    reconciliation_error: canAdvance ? null : 'Transfer event arrived out of order or after a later local transfer state.',
  }

  if (event.type === 'transfer.created') {
    paymentUpdates.status = paymentStatus === 'released' ? payment.status : 'transferring'
  }

  if (event.type === 'transfer.paid') {
    paymentUpdates.status = 'released'
    paymentUpdates.released_at = payment.released_at || nowIso()
  }

  if (event.type === 'transfer.failed') {
    paymentUpdates.status = paymentStatus === 'released' ? payment.status : 'held'
    paymentUpdates.reconciliation_status = 'needs_review'
    paymentUpdates.reconciliation_error = 'Transfer failed.'
  }

  if (event.type === 'transfer.reversed') {
    paymentUpdates.status = payment.status
    paymentUpdates.reconciliation_status = 'needs_review'
    paymentUpdates.reconciliation_error = 'Transfer reversed.'
  }

  const updatedPayment = await updatePaymentRow(payment.id, paymentUpdates)

  let taskClosureResult = { closed: false, mismatch: false }
  if (event.type === 'transfer.paid') {
    taskClosureResult = await closeTaskAfterTransferPaid(
      updatedPayment || payment,
      event,
      eventRow,
      enrichedObject,
      correlationId,
    )
  }

  await maybeCreateWebHookAudit({
    eventType:
      event.type === 'transfer.created'
        ? 'transfer_created'
        : event.type === 'transfer.paid'
          ? 'transfer_paid'
          : event.type === 'transfer.failed'
            ? 'transfer_failed'
            : 'transfer_reversed',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      transfer_id: getStripeObjectId(enrichedObject),
      amount_cents: amountCents,
      status: nextStatus,
      payment_status: paymentUpdates.status || payment.status,
      task_closed: Boolean(taskClosureResult.closed),
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'Transfer event arrived out of order or after a later local transfer state.',
      metadata: {
        transfer_id: getStripeObjectId(enrichedObject),
        source_transaction: getStripeObjectId(enrichedObject.source_transaction),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })

    if (event.type === 'transfer.paid' && taskClosureResult.mismatch) {
      await markFinancialMismatch({
        entityType: 'task',
        entityId: payment.task_id || payment.id,
        reason: 'Transfer paid but the related task could not be closed.',
        metadata: {
          payment_id: payment.id,
          transfer_id: getStripeObjectId(enrichedObject),
        },
        payment: updatedPayment || payment,
        eventRow,
        stripeEventId: event.id,
        correlationId,
      })
    }
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance || taskClosureResult.mismatch,
  }
}

async function handlePayoutEvent(event, eventRow, object) {
  const enrichedObject = await maybeRefreshStripeObject(event, object)
  const payment = await resolvePaymentFromEvent(event, enrichedObject)
  const nextStatus = event.type === 'payout.paid' ? 'paid' : 'failed'

  if (!payment) {
    await markFinancialMismatch({
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      reason: 'Payout event without a matching local payment.',
      metadata: {
        payout_id: getStripeObjectId(enrichedObject),
      },
      eventRow,
      stripeEventId: event.id,
      correlationId: eventRow.correlation_id,
    })

    return {
      mismatch: true,
    }
  }

  const currentPayout = await supabaseAdmin
    .from('payouts')
    .select('*')
    .eq('stripe_payout_id', getStripeObjectId(enrichedObject))
    .maybeSingle()

  if (currentPayout?.error && !isMissingRecordError(currentPayout.error)) {
    throw currentPayout.error
  }

  const existingPayout = currentPayout?.data || null
  const canAdvance = !existingPayout || canAdvancePayoutStatus(existingPayout.status, nextStatus)
  const correlationId = getCorrelationIdForPayment(payment, eventRow, enrichedObject)
  const amountCents = resolveAmountCents(payment, enrichedObject, ['amount'])
  const storedPayoutStatus = canAdvance ? nextStatus : existingPayout?.status || nextStatus

  await mirrorPayout(payment, event, enrichedObject, eventRow, storedPayoutStatus)

  await maybeCreateWebHookAudit({
    eventType: event.type === 'payout.paid' ? 'payout_paid' : 'payout_failed',
    event,
    entityType: 'payment',
    entityId: payment.id,
    afterState: {
      payout_id: getStripeObjectId(enrichedObject),
      amount_cents: amountCents,
      status: nextStatus,
    },
    severity: canAdvance ? 'info' : 'warning',
    metadata: {
      payment_id: payment.id,
    },
    correlationId,
  })

  if (!canAdvance) {
    await markFinancialMismatch({
      entityType: 'payment',
      entityId: payment.id,
      reason: 'Payout event arrived out of order or after a later local payout state.',
      metadata: {
        payout_id: getStripeObjectId(enrichedObject),
      },
      payment,
      eventRow,
      stripeEventId: event.id,
      correlationId,
    })
  }

  return {
    paymentId: payment.id,
    mismatch: !canAdvance,
  }
}

async function handleUnhandledStripeEvent(event, eventRow, object) {
  await createIdempotentAuditEvent({
    eventType: 'stripe_webhook_received',
    severity: 'info',
    actorType: 'stripe',
    entityType: 'stripe_webhook_event',
    entityId: event.id,
    afterState: {
      event_type: event.type,
    },
    correlationId: eventRow.correlation_id || getWebhookCorrelationId(event),
    stripeEventId: event.id,
    metadata: {
      processing_mode: 'event-layer',
      stripe_object_id: getStripeObjectId(object),
    },
  })

  return {
    ignored: true,
  }
}

function getEventHandler(eventType) {
  if (eventType === 'account.updated') {
    return handleConnectAccountUpdated
  }

  if (eventType === 'checkout.session.completed') {
    return handleCheckoutSessionCompleted
  }

  if (eventType === 'payment_intent.succeeded') {
    return handlePaymentIntentSucceeded
  }

  if (eventType === 'payment_intent.payment_failed') {
    return handlePaymentIntentFailed
  }

  if (eventType === 'charge.refunded') {
    return handleChargeRefunded
  }

  if (eventType.startsWith('charge.dispute.')) {
    return handleDisputeEvent
  }

  if (eventType.startsWith('transfer.')) {
    return handleTransferEvent
  }

  if (eventType.startsWith('payout.')) {
    return handlePayoutEvent
  }

  return handleUnhandledStripeEvent
}

export async function processStripeWebhookEvent(event) {
  ensureSupabaseAdmin()

  if (!event?.id || !event?.type) {
    throw createDomainError('Invalid Stripe event payload.', 400)
  }

  const { eventRow: inboxEventRow, duplicate } = await createWebhookEventInboxRow(event)
  let eventRow = inboxEventRow

  if (duplicate && eventRow.processing_status === 'processed') {
    return {
      duplicate: true,
      processed: true,
      eventId: eventRow.id,
      eventType: event.type,
    }
  }

  if (eventRow.processing_status === 'processing') {
    if (isWebhookProcessingStale(eventRow)) {
      await markWebhookFailed(
        eventRow,
        createDomainError('Webhook processing timed out; retrying event.', 500),
        {
          correlationId: eventRow.correlation_id || getWebhookCorrelationId(event),
        },
      )
      eventRow = {
        ...eventRow,
        processing_status: 'failed',
      }
    } else {
      return {
        duplicate: true,
        processed: false,
        eventId: eventRow.id,
        eventType: event.type,
        processing: true,
      }
    }
  }

  const processingRow = await markWebhookProcessing(eventRow)
  const object = getStripeObject(event)

  try {
    const handler = getEventHandler(event.type)
    const result = await handler(event, processingRow, object)

    await markWebhookProcessed(processingRow, {
      correlationId: processingRow.correlation_id || getWebhookCorrelationId(event),
    })

    return {
      duplicate: false,
      processed: true,
      eventId: processingRow.id,
      eventType: event.type,
      mismatch: Boolean(result?.mismatch),
    }
  } catch (error) {
    await markWebhookFailed(processingRow, error, {
      correlationId: processingRow.correlation_id || getWebhookCorrelationId(event),
    })

    await createIdempotentAuditEvent({
      eventType: 'stripe_webhook_failed',
      severity: 'error',
      actorType: 'stripe',
      entityType: 'stripe_webhook_event',
      entityId: event.id,
      afterState: {
        error: normalizeText(error?.message) || 'Webhook processing failed.',
        type: event.type,
      },
      correlationId: processingRow.correlation_id || getWebhookCorrelationId(event),
      stripeEventId: event.id,
      metadata: {
        webhook_event_id: processingRow.id,
      },
    }).catch(() => null)

    throw error
  }
}

export {
  createWebhookEventInboxRow,
  getExistingWebhookEvent,
  markWebhookProcessing,
  maybeRefreshStripeObject,
  resolvePaymentFromEvent,
  markFinancialMismatch,
  maybeCreatePaymentLedgerEntries,
}
