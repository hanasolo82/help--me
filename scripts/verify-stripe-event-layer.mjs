import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  ensureStripeWebhookSignatureHeader,
  processStripeWebhookEvent,
} from '../server/services/financial.service.js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

for (const [key, value] of Object.entries({
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
})) {
  if (!value) {
    throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
  }
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

async function createTestUser(label) {
  const email = `stripe-layer-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Stripe Layer ${label}`,
      name: `Stripe Layer ${label}`,
    },
  })

  if (error) throw error

  return {
    id: data.user.id,
    email,
    password,
  }
}

async function ensureProfile(user, roleLabel, overrides = {}) {
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
      ...overrides,
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
    description: 'Temporary task used to verify the Stripe event layer.',
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
  const idempotencyKey = `stripe-layer-${suffix}-${paymentId}`

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
    idempotency_key: idempotencyKey,
    reconciliation_status: 'pending',
    metadata: {
      scenario: suffix,
    },
  })

  if (error) throw error

  return {
    paymentId,
    taskId,
    requesterId,
    helperId,
    correlationId,
    idempotencyKey,
  }
}

function stripeEvent(id, type, object, account = null) {
  return {
    id,
    type,
    livemode: false,
    account,
    data: {
      object,
    },
  }
}

async function countRows(table, column, value) {
  let query = admin.from(table).select('id')
  if (column) {
    query = query.eq(column, value)
  }

  const { data, error } = await query
  if (error) throw error
  return data?.length || 0
}

async function getSingle(table, column, value) {
  const { data, error } = await admin.from(table).select('*').eq(column, value).maybeSingle()
  if (error) throw error
  return data
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function testSignatureRejection() {
  let rejected = false

  try {
    ensureStripeWebhookSignatureHeader('')
  } catch (error) {
    rejected = error?.statusCode === 400
  }

  assert(rejected, 'Webhook signature helper must reject missing signatures.')
}

async function testConnectAccountIdempotency(helperId) {
  const eventId = `evt_connect_${randomUUID().slice(0, 8)}`
  const stripeAccountId = `acct_${randomUUID().slice(0, 12)}`

  await ensureProfile({ id: helperId }, 'helper', {
    stripe_account_id: stripeAccountId,
    stripe_onboarding_completed: false,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
  })

  const event = stripeEvent(eventId, 'account.updated', {
    id: stripeAccountId,
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    country: 'ES',
    default_currency: 'eur',
    metadata: {
      profile_id: helperId,
    },
  })

  await processStripeWebhookEvent(event)
  await processStripeWebhookEvent(event)

  const webhookRows = await countRows('stripe_webhook_events', 'stripe_event_id', eventId)
  const auditRows = await countRows('audit_events', 'stripe_event_id', eventId)
  const connectAccount = await getSingle('connect_accounts', 'stripe_account_id', stripeAccountId)
  const legacyProfile = await getSingle('profiles', 'id', helperId)

  assert(webhookRows === 1, 'account.updated should be stored once in the webhook inbox.')
  assert(auditRows === 1, 'account.updated should not duplicate audit events.')
  assert(Boolean(connectAccount?.charges_enabled), 'account.updated should sync connect_accounts.')
  assert(Boolean(legacyProfile?.stripe_charges_enabled), 'account.updated should sync the legacy profile mirror.')

  return {
    eventId,
    stripeAccountId,
  }
}

async function testPaymentIntentSucceededIdempotency(payment) {
  const eventId = `evt_pi_succeeded_${randomUUID().slice(0, 8)}`
  const paymentIntentId = `pi_${randomUUID().slice(0, 12)}`
  const chargeId = `ch_${randomUUID().slice(0, 12)}`

  const event = stripeEvent(eventId, 'payment_intent.succeeded', {
    id: paymentIntentId,
    amount: 1234,
    currency: 'eur',
    metadata: {
      payment_id: payment.paymentId,
      correlation_id: payment.correlationId,
      task_id: payment.taskId,
    },
    latest_charge: {
      id: chargeId,
      balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    },
  })

  await processStripeWebhookEvent(event)
  await processStripeWebhookEvent(event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)
  const ledgerCount = await countRows('payment_ledger_entries', 'payment_id', payment.paymentId)
  const paymentAuditCount = await admin
    .from('audit_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .eq('entity_type', 'payment')
  const taskAuditCount = await admin
    .from('audit_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .eq('entity_type', 'task')

  assert(paymentRow?.status === 'held', 'payment_intent.succeeded should promote the payment to held.')
  assert(taskRow?.status === 'in_progress', 'payment_intent.succeeded should move the task to in_progress.')
  assert(ledgerCount === 2, 'payment_intent.succeeded should create exactly two ledger entries.')
  assert((paymentAuditCount.data?.length || 0) === 1, 'payment_intent.succeeded should create one payment audit event.')
  assert((taskAuditCount.data?.length || 0) === 1, 'payment_intent.succeeded should create one task audit event.')

  return {
    eventId,
    paymentIntentId,
  }
}

function buildPaymentIntentSucceededEvent(payment, suffix) {
  const eventId = `evt_pi_succeeded_${suffix}_${randomUUID().slice(0, 8)}`
  const paymentIntentId = `pi_${randomUUID().slice(0, 12)}`

  return {
    eventId,
    paymentIntentId,
    event: stripeEvent(eventId, 'payment_intent.succeeded', {
      id: paymentIntentId,
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
    }),
  }
}

function buildCheckoutCompletedEvent(payment, paymentIntentId, suffix) {
  const eventId = `evt_checkout_completed_${suffix}_${randomUUID().slice(0, 8)}`

  return {
    eventId,
    event: stripeEvent(eventId, 'checkout.session.completed', {
      id: `cs_test_${randomUUID().slice(0, 12)}`,
      amount_total: 1234,
      currency: 'eur',
      status: 'complete',
      payment_status: 'paid',
      payment_intent: paymentIntentId,
      metadata: {
        payment_id: payment.paymentId,
        correlation_id: payment.correlationId,
        task_id: payment.taskId,
      },
    }),
  }
}

async function testCheckoutCannotRegressHeldPayment(payment) {
  const paymentIntent = buildPaymentIntentSucceededEvent(payment, 'checkout-late')
  const checkout = buildCheckoutCompletedEvent(payment, paymentIntent.paymentIntentId, 'checkout-late')

  await processStripeWebhookEvent(paymentIntent.event)
  await processStripeWebhookEvent(checkout.event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)

  assert(paymentRow?.status === 'held', 'A late checkout event must not regress a held payment to processing.')
  assert(paymentRow?.reconciliation_status === 'reconciled', 'A late checkout event should remain reconciled.')
  assert(taskRow?.status === 'in_progress', 'A late checkout event must not regress the task.')

  return {
    checkoutEventId: checkout.eventId,
    paymentIntentEventId: paymentIntent.eventId,
  }
}

async function testConcurrentCheckoutAndPaymentIntent(payment) {
  const paymentIntent = buildPaymentIntentSucceededEvent(payment, 'concurrent')
  const checkout = buildCheckoutCompletedEvent(payment, paymentIntent.paymentIntentId, 'concurrent')

  await Promise.all([
    processStripeWebhookEvent(paymentIntent.event),
    processStripeWebhookEvent(checkout.event),
  ])

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)

  assert(paymentRow?.status === 'held', 'Concurrent checkout/payment events must converge on held.')
  assert(paymentRow?.reconciliation_status === 'reconciled', 'Concurrent checkout/payment events should reconcile.')
  assert(taskRow?.status === 'in_progress', 'Concurrent checkout/payment events must advance the task once.')

  return {
    checkoutEventId: checkout.eventId,
    paymentIntentEventId: paymentIntent.eventId,
  }
}

async function testPaymentIntentFailed(payment) {
  const eventId = `evt_pi_failed_${randomUUID().slice(0, 8)}`
  const paymentIntentId = `pi_${randomUUID().slice(0, 12)}`

  const event = stripeEvent(eventId, 'payment_intent.payment_failed', {
    id: paymentIntentId,
    amount: 1234,
    currency: 'eur',
    metadata: {
      payment_id: payment.paymentId,
      correlation_id: payment.correlationId,
      task_id: payment.taskId,
    },
  })

  await processStripeWebhookEvent(event)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const ledgerCount = await countRows('payment_ledger_entries', 'payment_id', payment.paymentId)

  assert(paymentRow?.status === 'failed', 'payment_intent.payment_failed should mark the payment as failed.')
  assert(ledgerCount === 1, 'payment_intent.payment_failed should create exactly one ledger entry.')

  return {
    eventId,
    paymentIntentId,
  }
}

async function testOutOfOrderHandling(payment) {
  const successEventId = `evt_out_of_order_success_${randomUUID().slice(0, 8)}`
  const failEventId = `evt_out_of_order_fail_${randomUUID().slice(0, 8)}`
  const paymentIntentId = `pi_${randomUUID().slice(0, 12)}`
  const chargeId = `ch_${randomUUID().slice(0, 12)}`

  const successEvent = stripeEvent(successEventId, 'payment_intent.succeeded', {
    id: paymentIntentId,
    amount: 1234,
    currency: 'eur',
    metadata: {
      payment_id: payment.paymentId,
      correlation_id: payment.correlationId,
      task_id: payment.taskId,
    },
    latest_charge: {
      id: chargeId,
      balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    },
  })

  const failEvent = stripeEvent(failEventId, 'payment_intent.payment_failed', {
    id: paymentIntentId,
    amount: 1234,
    currency: 'eur',
    metadata: {
      payment_id: payment.paymentId,
      correlation_id: payment.correlationId,
      task_id: payment.taskId,
    },
  })

  await processStripeWebhookEvent(successEvent)
  await processStripeWebhookEvent(failEvent)

  const paymentRow = await getSingle('payments', 'id', payment.paymentId)
  const taskRow = await getSingle('tasks', 'id', payment.taskId)
  const mismatchCount = await countRows('audit_events', 'stripe_event_id', failEventId)

  assert(paymentRow?.status === 'held', 'An out-of-order failure must not regress a held payment.')
  assert(taskRow?.status === 'in_progress', 'An out-of-order failure must not regress an in_progress task.')
  assert(paymentRow?.reconciliation_status === 'needs_review', 'Out-of-order events should mark the payment needs_review.')
  assert(mismatchCount >= 1, 'Out-of-order events should create mismatch/audit entries.')

  return {
    successEventId,
    failEventId,
    paymentIntentId,
  }
}

async function testMissingLocalPaymentMismatch() {
  const eventId = `evt_missing_payment_${randomUUID().slice(0, 8)}`
  const paymentIntentId = `pi_${randomUUID().slice(0, 12)}`

  const event = stripeEvent(eventId, 'payment_intent.succeeded', {
    id: paymentIntentId,
    amount: 1234,
    currency: 'eur',
    metadata: {
      correlation_id: randomUUID(),
      task_id: randomUUID(),
    },
    latest_charge: {
      id: `ch_${randomUUID().slice(0, 12)}`,
      balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    },
  })

  await processStripeWebhookEvent(event)

  const auditCount = await countRows('audit_events', 'stripe_event_id', eventId)
  const webhookRow = await getSingle('stripe_webhook_events', 'stripe_event_id', eventId)
  const ledgerCount = await countRows('payment_ledger_entries', 'source_event_id', webhookRow.id)

  assert(webhookRow?.processing_status === 'processed', 'Missing payment mismatch should still complete webhook processing.')
  assert(auditCount >= 1, 'Missing payment should produce a reconciliation audit event.')
  assert(ledgerCount === 0, 'Missing payment should not create ledger entries.')

  return {
    eventId,
  }
}

async function cleanup(ids) {
  if (ids.eventIds.length > 0) {
    await admin.from('audit_events').delete().in('stripe_event_id', ids.eventIds)
    await admin.from('stripe_webhook_events').delete().in('stripe_event_id', ids.eventIds)
  }

  if (ids.paymentIds.length > 0) {
    await admin.from('payments').delete().in('id', ids.paymentIds)
  }

  if (ids.taskIds.length > 0) {
    await admin.from('tasks').delete().in('id', ids.taskIds)
  }

  if (ids.profileIds.length > 0) {
    await admin.from('profiles').delete().in('id', ids.profileIds)
  }

  if (ids.userIds.length > 0) {
    for (const userId of ids.userIds) {
      await admin.auth.admin.deleteUser(userId)
    }
  }
}

async function main() {
  const ids = {
    eventIds: [],
    paymentIds: [],
    taskIds: [],
    profileIds: [],
    userIds: [],
  }

  try {
    await testSignatureRejection()

    const requester = await createTestUser('requester')
    const helper = await createTestUser('helper')
    const outsider = await createTestUser('outsider')

    ids.userIds.push(requester.id, helper.id, outsider.id)
    ids.profileIds.push(requester.id, helper.id, outsider.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper')
    await ensureProfile(outsider, 'outsider')

    const taskSuccess = await createTask(requester.id, helper.id, 'Stripe event layer success task')
    const taskFailed = await createTask(requester.id, helper.id, 'Stripe event layer failed task')
    const taskOutOfOrder = await createTask(requester.id, helper.id, 'Stripe event layer out-of-order task')
    const taskCheckoutLate = await createTask(requester.id, helper.id, 'Stripe event layer late checkout task')
    const taskConcurrent = await createTask(requester.id, helper.id, 'Stripe event layer concurrent task')

    ids.taskIds.push(taskSuccess, taskFailed, taskOutOfOrder, taskCheckoutLate, taskConcurrent)

    const paymentSuccess = await createPayment(taskSuccess, requester.id, helper.id, 'success')
    const paymentFailed = await createPayment(taskFailed, requester.id, helper.id, 'failed')
    const paymentOutOfOrder = await createPayment(taskOutOfOrder, requester.id, helper.id, 'out-of-order')
    const paymentCheckoutLate = await createPayment(taskCheckoutLate, requester.id, helper.id, 'checkout-late')
    const paymentConcurrent = await createPayment(taskConcurrent, requester.id, helper.id, 'concurrent')

    ids.paymentIds.push(
      paymentSuccess.paymentId,
      paymentFailed.paymentId,
      paymentOutOfOrder.paymentId,
      paymentCheckoutLate.paymentId,
      paymentConcurrent.paymentId,
    )

    const connectScenario = await testConnectAccountIdempotency(helper.id)
    const successScenario = await testPaymentIntentSucceededIdempotency(paymentSuccess)
    const checkoutLateScenario = await testCheckoutCannotRegressHeldPayment(paymentCheckoutLate)
    const concurrentScenario = await testConcurrentCheckoutAndPaymentIntent(paymentConcurrent)
    const failedScenario = await testPaymentIntentFailed(paymentFailed)
    const outOfOrderScenario = await testOutOfOrderHandling(paymentOutOfOrder)
    const missingPaymentScenario = await testMissingLocalPaymentMismatch()

    ids.eventIds.push(
      connectScenario.eventId,
      successScenario.eventId,
      checkoutLateScenario.paymentIntentEventId,
      checkoutLateScenario.checkoutEventId,
      concurrentScenario.paymentIntentEventId,
      concurrentScenario.checkoutEventId,
      failedScenario.eventId,
      outOfOrderScenario.successEventId,
      outOfOrderScenario.failEventId,
      missingPaymentScenario.eventId,
    )

    console.log('Stripe event layer checks passed.')
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    await cleanup(ids)
  }
}

main()
