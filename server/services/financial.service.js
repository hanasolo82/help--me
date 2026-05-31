import { createHash, randomUUID } from 'node:crypto'
import { supabaseAdmin } from './supabase.service.js'
import { syncStripeAccountFromWebhook } from './stripe.service.js'

function nowIso() {
  return new Date().toISOString()
}

function ensureSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }
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

export function ensureIdempotencyKey(value, namespace = 'financial') {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || `${namespace}:${randomUUID()}`
}

export function getOrCreateCorrelationId(record = null) {
  if (record && typeof record === 'object' && typeof record.correlation_id === 'string' && record.correlation_id.trim()) {
    return record.correlation_id.trim()
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

export async function createLedgerEntry(entry) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('payment_ledger_entries')
    .insert({
      payment_id: entry.paymentId,
      requester_profile_id: entry.requesterProfileId,
      helper_profile_id: entry.helperProfileId,
      entry_type: entry.entryType,
      direction: entry.direction,
      account_code: entry.accountCode,
      amount_cents: entry.amountCents,
      platform_fee_cents: entry.platformFeeCents ?? 0,
      helper_amount_cents: entry.helperAmountCents ?? 0,
      currency: entry.currency || 'eur',
      stripe_object_type: entry.stripeObjectType ?? null,
      stripe_object_id: entry.stripeObjectId ?? null,
      source_event_id: entry.sourceEventId ?? null,
      correlation_id: entry.correlationId,
      idempotency_key: ensureIdempotencyKey(entry.idempotencyKey, 'ledger'),
      created_by_system: entry.createdBySystem || 'backend',
      metadata: safeJson(entry.metadata),
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function persistStripeWebhookEvent(event) {
  ensureSupabaseAdmin()

  const payloadHash = hashPayload(event)

  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({
        stripe_event_id: event.id,
        type: event.type,
        livemode: Boolean(event.livemode),
        stripe_account_id: event.account || null,
        payload: event,
        payload_hash: payloadHash,
        processing_status: 'received',
        processing_attempts: 0,
        received_at: nowIso(),
      })
      .select('*')
      .single()

    if (error) throw error
    return { eventRow: data, duplicate: false }
  } catch (error) {
    if (error?.code !== '23505') {
      throw error
    }

    const { data, error: fetchError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('*')
      .eq('stripe_event_id', event.id)
      .maybeSingle()

    if (fetchError) throw fetchError
    return { eventRow: data, duplicate: true }
  }
}

async function updateStripeWebhookEvent(id, updates) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      ...updates,
      processed_at: updates.processed_at ?? (updates.processing_status === 'processed' ? nowIso() : null),
    })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function processStripeWebhookEvent(event) {
  const { eventRow, duplicate } = await persistStripeWebhookEvent(event)

  if (duplicate && eventRow.processing_status === 'processed') {
    return { duplicate: true, processed: true, eventId: eventRow.id }
  }

  await updateStripeWebhookEvent(eventRow.id, {
    processing_status: 'processing',
    processing_attempts: (eventRow.processing_attempts || 0) + 1,
  })

  try {
    if (event.type === 'account.updated') {
      await syncStripeAccountFromWebhook(event.data.object)

      await createAuditEvent({
        eventType: 'connect_account_synced',
        severity: 'info',
        actorType: 'stripe',
        entityType: 'connect_account',
        entityId: event.data.object.id,
        afterState: {
          charges_enabled: Boolean(event.data.object.charges_enabled),
          payouts_enabled: Boolean(event.data.object.payouts_enabled),
          details_submitted: Boolean(event.data.object.details_submitted),
        },
        stripeEventId: eventRow.stripe_event_id,
        metadata: {
          stripe_account_id: event.data.object.id,
        },
      })
    } else {
      await createAuditEvent({
        eventType: 'stripe_webhook_received',
        severity: 'info',
        actorType: 'stripe',
        entityType: 'stripe_webhook_event',
        entityId: eventRow.stripe_event_id,
        afterState: {
          event_type: event.type,
        },
        stripeEventId: eventRow.stripe_event_id,
        metadata: {
          processing_mode: 'foundation',
        },
      })
    }

    await updateStripeWebhookEvent(eventRow.id, {
      processing_status: 'processed',
      error_message: null,
      processed_at: nowIso(),
    })

    return { duplicate: false, processed: true, eventId: eventRow.id }
  } catch (error) {
    await updateStripeWebhookEvent(eventRow.id, {
      processing_status: 'failed',
      error_message: error?.message || 'Webhook processing failed.',
    })

    await createAuditEvent({
      eventType: 'stripe_webhook_failed',
      severity: 'error',
      actorType: 'stripe',
      entityType: 'stripe_webhook_event',
      entityId: eventRow.stripe_event_id,
      afterState: {
        error: error?.message || 'Webhook processing failed.',
        type: event.type,
      },
      stripeEventId: eventRow.stripe_event_id,
      metadata: {
        webhook_event_id: eventRow.id,
      },
    }).catch(() => null)

    throw error
  }
}
