// QA de fiabilidad del webhook Stripe: cierra los huecos que verify-stripe-event-layer
// no cubre (procesamiento concurrente, fila atascada/stale, reintento tras no-2xx,
// y concurrencia real). Foco: un pago confirmado SIEMPRE acaba moviendo la tarea a
// in_progress, y nunca se duplica dinero ni transición.
//
//   pnpm run verify:webhook-reliability
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Apunta a un proyecto de TEST/STAGING: crea y borra usuarios, tasks, payments y eventos.

import { createHash, randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { processStripeWebhookEvent } from '../server/services/financial.service.js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) {
    throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
  }
}

const STALE_MS = 6 * 60 * 1000 // > STALE_WEBHOOK_PROCESSING_MS (5 min) en el servicio

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

// --- helpers de datos (mismo patrón que verify-stripe-event-layer.mjs) -------------

async function createTestUser(label) {
  const email = `wh-reliability-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `WH Reliability ${label}`, name: `WH Reliability ${label}` },
  })

  if (error) throw error
  return { id: data.user.id, email, password }
}

async function ensureProfile(user, roleLabel) {
  const username = `${roleLabel}_${randomUUID().slice(0, 10).replace(/-/g, '')}`.toLowerCase().slice(0, 30)

  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      username,
      full_name: `${roleLabel} User`,
      neighborhood: 'Test Area',
      account_status: 'active',
      rating: 0,
      completed_tasks: 0,
      verified: false,
      stripe_onboarding_completed: false,
      stripe_account_id: null,
      stripe_charges_enabled: false,
      stripe_payouts_enabled: false,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}

async function createTask(requesterId, helperId, title) {
  const taskId = randomUUID()

  const { error } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify webhook reliability.',
    category: 'Recados',
    price: 12.34,
    status: 'assigned',
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
  })

  if (error) throw error
  return taskId
}

async function createPayment(taskId, requesterId, helperId, suffix) {
  const paymentId = randomUUID()
  const correlationId = randomUUID()

  const { error } = await admin.from('payments').insert({
    id: paymentId,
    task_id: taskId,
    payer_id: requesterId,
    receiver_id: helperId,
    requester_profile_id: requesterId,
    helper_profile_id: helperId,
    amount: 12.34,
    platform_fee: 0.34,
    amount_cents: 1234,
    platform_fee_cents: 34,
    helper_amount_cents: 1200,
    currency: 'eur',
    status: 'draft',
    correlation_id: correlationId,
    idempotency_key: `wh-reliability-${suffix}-${paymentId}`,
    reconciliation_status: 'pending',
    metadata: { scenario: suffix },
  })

  if (error) throw error
  return { paymentId, taskId, requesterId, helperId, correlationId }
}

function paymentIntentSucceededEvent(eventId, payment) {
  return {
    id: eventId,
    type: 'payment_intent.succeeded',
    livemode: false,
    account: null,
    data: {
      object: {
        id: `pi_${randomUUID().slice(0, 12)}`,
        amount: 1234,
        currency: 'eur',
        metadata: {
          payment_id: payment.paymentId,
          correlation_id: payment.correlationId,
          task_id: payment.taskId,
        },
        latest_charge: {
          id: `ch_${randomUUID().slice(0, 12)}`,
          balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
        },
      },
    },
  }
}

// Pre-inserta una fila de inbox en un estado concreto para simular crash/atasco/fallo.
async function seedWebhookRow(event, { status, receivedAtMs, attempts = 1 }) {
  const { error } = await admin.from('stripe_webhook_events').insert({
    stripe_event_id: event.id,
    type: event.type,
    livemode: Boolean(event.livemode),
    stripe_account_id: null,
    payload: event,
    payload_hash: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
    processing_status: status,
    processing_attempts: attempts,
    received_at: new Date(receivedAtMs).toISOString(),
    correlation_id: randomUUID(),
  })

  if (error) throw error
}

async function getSingle(table, column, value) {
  const { data, error } = await admin.from(table).select('*').eq(column, value).maybeSingle()
  if (error) throw error
  return data
}

async function countRows(table, column, value) {
  const { data, error } = await admin.from(table).select('id').eq(column, value)
  if (error) throw error
  return data?.length || 0
}

async function countTaskTransitionAudits(taskId) {
  const { data, error } = await admin
    .from('audit_events')
    .select('id')
    .eq('entity_type', 'task')
    .eq('entity_id', String(taskId))
    .eq('event_type', 'task_moved_to_in_progress')
  if (error) throw error
  return data?.length || 0
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

// --- Tests -------------------------------------------------------------------------

// Test A — Fila en processing fresca: el reenvío devuelve retry y no toca el payment.
async function testStuckProcessingReturnsRetry(payment) {
  const eventId = `evt_stuck_${randomUUID().slice(0, 8)}`
  const event = paymentIntentSucceededEvent(eventId, payment)

  await seedWebhookRow(event, { status: 'processing', receivedAtMs: Date.now() })

  const result = await processStripeWebhookEvent(event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)

  assert(result?.processing === true, 'A: fila en processing fresca debe devolver {processing:true} (→ HTTP 409 retry).')
  assert(result?.processed !== true, 'A: no debe marcarse processed mientras otra ejecución la tiene en processing.')
  assert(paymentRow?.status === 'draft', 'A: el payment no debe avanzar mientras está en processing.')
  assert(taskRow?.status === 'assigned', 'A: la tarea no debe avanzar mientras está en processing.')

  return { eventId }
}

// Test B — Fila atascada en processing (stale): se recupera y completa la transición.
async function testStaleProcessingRecovers(payment) {
  const eventId = `evt_stale_${randomUUID().slice(0, 8)}`
  const event = paymentIntentSucceededEvent(eventId, payment)

  await seedWebhookRow(event, { status: 'processing', receivedAtMs: Date.now() - STALE_MS })

  const result = await processStripeWebhookEvent(event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)

  assert(result?.processed === true, 'B: una fila stale debe reprocesarse hasta processed.')
  assert(paymentRow?.status === 'held', 'B: tras recuperar el atasco el payment debe quedar held.')
  assert(taskRow?.status === 'in_progress', 'B: tras recuperar el atasco la tarea debe pasar a in_progress (pago no colgado).')

  return { eventId }
}

// Test C — Fila en failed (tras crash/no-2xx): el reintento de Stripe converge.
async function testFailedRowRetried(payment) {
  const eventId = `evt_failed_${randomUUID().slice(0, 8)}`
  const event = paymentIntentSucceededEvent(eventId, payment)

  await seedWebhookRow(event, { status: 'failed', receivedAtMs: Date.now() })

  const result = await processStripeWebhookEvent(event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)

  assert(result?.processed === true, 'C: una fila failed debe reprocesarse cuando Stripe reintenta.')
  assert(paymentRow?.status === 'held', 'C: el reintento debe dejar el payment held.')
  assert(taskRow?.status === 'in_progress', 'C: el reintento debe mover la tarea a in_progress.')

  return { eventId }
}

// Test D — Doble disparo concurrente: sin duplicar dinero ni transición.
async function testConcurrentDoubleFire(payment) {
  const eventId = `evt_concurrent_${randomUUID().slice(0, 8)}`
  const event = paymentIntentSucceededEvent(eventId, payment)

  const results = await Promise.allSettled([
    processStripeWebhookEvent(event),
    processStripeWebhookEvent(event),
  ])

  const rejected = results.filter((r) => r.status === 'rejected')
  assert(rejected.length === 0, `D: ninguna ejecución concurrente debe lanzar (${rejected.map((r) => r.reason?.message).join('; ')}).`)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)
  const ledgerCount = await countRows('payment_ledger_entries', 'payment_id', payment.paymentId)
  const webhookRows = await countRows('stripe_webhook_events', 'stripe_event_id', eventId)
  const transitionAudits = await countTaskTransitionAudits(payment.taskId)

  // Invariantes financieras DURAS:
  assert(paymentRow?.status === 'held', 'D: el payment debe quedar held exactamente una vez.')
  assert(taskRow?.status === 'in_progress', 'D: la tarea debe quedar in_progress.')
  assert(ledgerCount === 2, `D: deben existir exactamente 2 ledger entries (charge_captured + funds_held), no ${ledgerCount}.`)
  assert(webhookRows === 1, `D: el inbox debe tener una sola fila para el evento, no ${webhookRows}.`)

  // Invariante BLANDA (se reporta, no rompe): audits de transición.
  if (transitionAudits !== 1) {
    console.warn(
      `D: aviso — ${transitionAudits} audits 'task_moved_to_in_progress' (esperado 1). ` +
        'Sin impacto financiero, pero indica TOCTOU no-atómico en createIdempotentAuditEvent. Anotar como deuda.',
    )
  }

  return { eventId }
}

async function cleanup(ids) {
  if (ids.eventIds.length > 0) {
    await admin.from('audit_events').delete().in('stripe_event_id', ids.eventIds)
    await admin.from('stripe_webhook_events').delete().in('stripe_event_id', ids.eventIds)
  }
  if (ids.taskIds.length > 0) {
    await admin.from('audit_events').delete().in('entity_id', ids.taskIds)
  }
  if (ids.paymentIds.length > 0) {
    await admin.from('payment_ledger_entries').delete().in('payment_id', ids.paymentIds)
    await admin.from('payments').delete().in('id', ids.paymentIds)
  }
  if (ids.taskIds.length > 0) {
    await admin.from('tasks').delete().in('id', ids.taskIds)
  }
  if (ids.profileIds.length > 0) {
    await admin.from('profiles').delete().in('id', ids.profileIds)
  }
  for (const userId of ids.userIds) {
    await admin.auth.admin.deleteUser(userId)
  }
}

async function main() {
  const ids = { eventIds: [], paymentIds: [], taskIds: [], profileIds: [], userIds: [] }

  try {
    const requester = await createTestUser('requester')
    const helper = await createTestUser('helper')
    ids.userIds.push(requester.id, helper.id)
    ids.profileIds.push(requester.id, helper.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper')

    // Un par task+payment independiente por test, para no contaminar invariantes.
    const scenarios = {}
    for (const name of ['stuck', 'stale', 'failed', 'concurrent']) {
      const taskId = await createTask(requester.id, helper.id, `WH reliability ${name}`)
      const payment = await createPayment(taskId, requester.id, helper.id, name)
      ids.taskIds.push(taskId)
      ids.paymentIds.push(payment.paymentId)
      scenarios[name] = payment
    }

    const a = await testStuckProcessingReturnsRetry(scenarios.stuck)
    const b = await testStaleProcessingRecovers(scenarios.stale)
    const c = await testFailedRowRetried(scenarios.failed)
    const d = await testConcurrentDoubleFire(scenarios.concurrent)

    ids.eventIds.push(a.eventId, b.eventId, c.eventId, d.eventId)

    console.log('Webhook reliability checks passed.')
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    await cleanup(ids)
  }
}

main()
