import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { processStripeWebhookEvent } from '../server/services/financial.service.js'
import {
  completeTaskAndQueuePaymentRelease,
  processPaymentReleaseJobs,
} from '../server/services/payment-release-jobs.service.js'
import { stripe } from '../server/services/stripe.service.js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function paymentChargeId(paymentId) {
  return `ch_${paymentId.replace(/-/g, '').slice(0, 20)}`
}

async function createUser(label) {
  const email = `payment-release-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Payment Release ${label}` },
  })
  if (error) throw error
  return { id: data.user.id, email, password }
}

async function ensureProfile(user, label) {
  const username = `${label}${randomUUID().slice(0, 12).replace(/-/g, '')}`.slice(0, 30)
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    username,
    full_name: `${label} user`,
    neighborhood: 'Test Area',
    account_status: 'active',
  }, { onConflict: 'id' })
  if (error) throw error
}

async function ensureReadyConnectAccount(helperId) {
  const stripeAccountId = `acct_test_${randomUUID().replace(/-/g, '').slice(0, 18)}`
  const { error } = await admin.from('connect_accounts').upsert({
    profile_id: helperId,
    stripe_account_id: stripeAccountId,
    charges_enabled: true,
    payouts_enabled: true,
    details_submitted: true,
    last_stripe_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' })
  if (error) throw error
  return stripeAccountId
}

async function createReleaseFixture(requester, helper, suffix) {
  const taskId = randomUUID()
  const paymentId = randomUUID()
  const now = new Date().toISOString()
  const chargeId = paymentChargeId(paymentId)

  const { error: taskError } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requester.id,
    accepted_by: helper.id,
    title: `Release ${suffix}`,
    description: 'Temporary task used to verify durable payment release.',
    category: 'Recados',
    price: 12,
    status: 'in_progress',
    lat: 40.4168,
    lng: -3.7038,
    published_at: now,
  })
  if (taskError) throw taskError

  const { error: paymentError } = await admin.from('payments').insert({
    id: paymentId,
    task_id: taskId,
    payer_id: requester.id,
    receiver_id: helper.id,
    requester_profile_id: requester.id,
    helper_profile_id: helper.id,
    amount: 12,
    platform_fee: 0,
    amount_cents: 1200,
    platform_fee_cents: 0,
    helper_amount_cents: 1200,
    currency: 'eur',
    status: 'held',
    stripe_charge_id: chargeId,
    captured_at: now,
    held_at: now,
    correlation_id: randomUUID(),
    idempotency_key: `release-${suffix}-${paymentId}`,
    reconciliation_status: 'reconciled',
  })
  if (paymentError) throw paymentError

  return { taskId, paymentId, chargeId }
}

async function getSingle(table, column, value) {
  const { data, error } = await admin.from(table).select('*').eq(column, value).maybeSingle()
  if (error) throw error
  return data || null
}

function buildTransfer({ id, payment, destination, sourceTransaction, balanceTransaction = null }) {
  return {
    id,
    amount: 1200,
    currency: 'eur',
    destination,
    source_transaction: sourceTransaction,
    balance_transaction: balanceTransaction || `txn_${randomUUID().slice(0, 12)}`,
    reversed: false,
    metadata: {
      payment_id: payment.paymentId,
      task_id: payment.taskId,
    },
  }
}

async function withMockedStripe({ onCreate, onRetrieve }, callback) {
  const originalCreate = stripe.transfers.create
  const originalRetrieve = stripe.transfers.retrieve
  const originalChargeRetrieve = stripe.charges.retrieve
  const createCalls = []

  stripe.charges.retrieve = async (chargeId) => ({
    id: chargeId,
    paid: true,
    refunded: false,
    amount: 1200,
    currency: 'eur',
  })
  stripe.transfers.create = async (params, options) => {
    createCalls.push({ params, options })
    return onCreate(params, options, createCalls.length)
  }
  stripe.transfers.retrieve = async (transferId) => onRetrieve(transferId)

  try {
    return await callback(createCalls)
  } finally {
    stripe.transfers.create = originalCreate
    stripe.transfers.retrieve = originalRetrieve
    stripe.charges.retrieve = originalChargeRetrieve
  }
}

async function queueWithoutWorker(fixture, requester) {
  const { data, error } = await admin.rpc('queue_task_payment_release', {
    p_task_id: fixture.taskId,
    p_requester_id: requester.id,
  })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

function stripeEvent(id, type, object) {
  return { id, type, livemode: false, data: { object } }
}

async function testSuccessfulResponse(requester, helper, destination) {
  const fixture = await createReleaseFixture(requester, helper, 'success')
  const transfer = buildTransfer({
    id: `tr_${randomUUID().slice(0, 24)}`,
    payment: fixture,
    destination,
    sourceTransaction: fixture.chargeId,
  })

  await withMockedStripe({
    onCreate: () => transfer,
    onRetrieve: () => transfer,
  }, async (calls) => {
    const first = await completeTaskAndQueuePaymentRelease({ taskId: fixture.taskId, requester })
    const second = await completeTaskAndQueuePaymentRelease({ taskId: fixture.taskId, requester })
    assert(calls.length === 1, 'A duplicate close request must create one Stripe Transfer.')
    assert(calls[0].params.source_transaction === fixture.chargeId, 'Transfer must use payment.stripe_charge_id as source_transaction.')
    assert(calls[0].options.idempotencyKey, 'Transfer must have a durable idempotency key.')
    assert(first.payment_status === 'released', 'Successful Stripe response must release locally without waiting for a webhook.')
    assert(second.task_status === 'closed', 'Duplicate close request must preserve the closed task.')
  })

  const [payment, task, localTransfer, job] = await Promise.all([
    getSingle('payments', 'id', fixture.paymentId),
    getSingle('tasks', 'id', fixture.taskId),
    getSingle('transfers', 'payment_id', fixture.paymentId),
    getSingle('payment_release_jobs', 'payment_id', fixture.paymentId),
  ])
  assert(payment?.status === 'released' && payment?.reconciliation_status === 'reconciled', 'Payment must be released and reconciled.')
  assert(task?.status === 'closed', 'Task must close in the same local finalization.')
  assert(localTransfer?.status === 'paid' && localTransfer?.stripe_transfer_id === transfer.id, 'Local transfer must be paid after Stripe success.')
  assert(job?.status === 'succeeded', 'Release job must be succeeded after finalization.')

  return fixture
}

async function testCreatedWebhookRecovery(requester, helper, destination) {
  const fixture = await createReleaseFixture(requester, helper, 'webhook-recovery')
  const queued = await queueWithoutWorker(fixture, requester)
  const transfer = buildTransfer({
    id: `tr_${randomUUID().slice(0, 24)}`,
    payment: fixture,
    destination,
    sourceTransaction: fixture.chargeId,
  })
  const eventId = `evt_transfer_created_${randomUUID().slice(0, 10)}`

  await withMockedStripe({
    onCreate: () => { throw new Error('create is not expected during webhook recovery') },
    onRetrieve: () => transfer,
  }, async () => {
    await processStripeWebhookEvent(stripeEvent(eventId, 'transfer.created', transfer))
    await processStripeWebhookEvent(stripeEvent(eventId, 'transfer.created', transfer))
  })

  const [payment, task, job, event] = await Promise.all([
    getSingle('payments', 'id', fixture.paymentId),
    getSingle('tasks', 'id', fixture.taskId),
    getSingle('payment_release_jobs', 'payment_id', fixture.paymentId),
    getSingle('stripe_webhook_events', 'stripe_event_id', eventId),
  ])
  assert(queued?.job_id, 'The recovery fixture must have a durable job before the webhook.')
  assert(payment?.status === 'released' && task?.status === 'closed', 'transfer.created must recover a post-Stripe process crash.')
  assert(job?.status === 'succeeded', 'transfer.created recovery must finalize the job idempotently.')
  assert(event?.processing_status === 'processed', 'transfer.created must remain idempotent in the webhook inbox.')

  return { ...fixture, eventId }
}

async function testFailureAndRetry(requester, helper, destination) {
  const definitive = await createReleaseFixture(requester, helper, 'definitive-failure')
  const definitiveError = Object.assign(new Error('Insufficient funds.'), {
    code: 'insufficient_funds',
    statusCode: 400,
    type: 'StripeInvalidRequestError',
  })

  await withMockedStripe({
    onCreate: () => { throw definitiveError },
    onRetrieve: () => { throw definitiveError },
  }, () => completeTaskAndQueuePaymentRelease({ taskId: definitive.taskId, requester }))

  let [payment, task, job] = await Promise.all([
    getSingle('payments', 'id', definitive.paymentId),
    getSingle('tasks', 'id', definitive.taskId),
    getSingle('payment_release_jobs', 'payment_id', definitive.paymentId),
  ])
  assert(payment?.status === 'held' && payment?.reconciliation_status === 'needs_review', 'A definitive failure must keep money held and visible for review.')
  assert(task?.status === 'completed', 'A failed release must not close the task.')
  assert(job?.status === 'retry_wait' && !job?.idempotency_key, 'A definitive retry must request a fresh idempotency key.')

  const uncertain = await createReleaseFixture(requester, helper, 'uncertain-retry')
  const transientError = Object.assign(new Error('Stripe temporarily unavailable.'), {
    code: 'api_error',
    statusCode: 503,
    type: 'StripeAPIError',
  })
  const transfer = buildTransfer({
    id: `tr_${randomUUID().slice(0, 24)}`,
    payment: uncertain,
    destination,
    sourceTransaction: uncertain.chargeId,
  })
  const seenKeys = []

  await withMockedStripe({
    onCreate: (_params, options, attempt) => {
      seenKeys.push(options.idempotencyKey)
      if (attempt === 1) throw transientError
      return transfer
    },
    onRetrieve: () => transfer,
  }, async () => {
    await completeTaskAndQueuePaymentRelease({ taskId: uncertain.taskId, requester })
    job = await getSingle('payment_release_jobs', 'payment_id', uncertain.paymentId)
    assert(job?.status === 'retry_wait' && job?.idempotency_key, 'An uncertain result must keep its idempotency key.')
    await admin.from('payment_release_jobs').update({ next_attempt_at: new Date().toISOString() }).eq('id', job.id)
    await processPaymentReleaseJobs({ jobId: job.id, limit: 1 })
  })

  payment = await getSingle('payments', 'id', uncertain.paymentId)
  assert(seenKeys.length === 2 && seenKeys[0] === seenKeys[1], 'An uncertain retry must reuse its idempotency key.')
  assert(payment?.status === 'released', 'The retry must finalize after Stripe responds successfully.')

  return [definitive, uncertain]
}

async function cleanup(ids) {
  if (ids.eventIds.length) {
    await admin.from('audit_events').delete().in('stripe_event_id', ids.eventIds)
    await admin.from('stripe_webhook_events').delete().in('stripe_event_id', ids.eventIds)
  }
  if (ids.paymentIds.length) {
    await admin.from('audit_events').delete().in('entity_id', ids.paymentIds)
    await admin.from('payments').delete().in('id', ids.paymentIds)
  }
  if (ids.taskIds.length) {
    await admin.from('audit_events').delete().in('entity_id', ids.taskIds)
    await admin.from('tasks').delete().in('id', ids.taskIds)
  }
  if (ids.profileIds.length) await admin.from('profiles').delete().in('id', ids.profileIds)
  for (const userId of ids.userIds) await admin.auth.admin.deleteUser(userId)
}

async function main() {
  const ids = { userIds: [], profileIds: [], paymentIds: [], taskIds: [], eventIds: [] }
  try {
    const requester = await createUser('requester')
    const helper = await createUser('helper')
    ids.userIds.push(requester.id, helper.id)
    ids.profileIds.push(requester.id, helper.id)
    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper')
    const destination = await ensureReadyConnectAccount(helper.id)

    const success = await testSuccessfulResponse(requester, helper, destination)
    const recovery = await testCreatedWebhookRecovery(requester, helper, destination)
    const failures = await testFailureAndRetry(requester, helper, destination)
    for (const fixture of [success, recovery, ...failures]) {
      ids.paymentIds.push(fixture.paymentId)
      ids.taskIds.push(fixture.taskId)
    }
    ids.eventIds.push(recovery.eventId)

    console.log('Payment release checks passed: response, recovery, duplicate, definitive failure and uncertain retry.')
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    await cleanup(ids)
  }
}

main()
