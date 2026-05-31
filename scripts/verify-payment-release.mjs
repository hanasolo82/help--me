import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { processStripeWebhookEvent } from '../server/services/financial.service.js'
import { releasePaymentFunds } from '../server/services/payments.service.js'
import { createOrGetConnectAccount, stripe } from '../server/services/stripe.service.js'

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

function createAuthedClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

async function createTestUser(label) {
  const email = `payment-release-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Payment Release ${label}`,
      name: `Payment Release ${label}`,
    },
  })

  if (error) throw error

  return {
    id: data.user.id,
    email,
    password,
  }
}

function buildUsernamePrefix(label) {
  const cleaned = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return cleaned || 'user'
}

async function ensureProfile(user, roleLabel) {
  const username = `${buildUsernamePrefix(roleLabel)}${randomUUID().slice(0, 12).replace(/-/g, '')}`.slice(0, 30)

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

async function ensureConnectAccount(user) {
  const stripeAccountId = await createOrGetConnectAccount(
    {
      id: user.id,
      email: user.email,
    },
    {
      id: user.id,
      stripe_account_id: null,
    },
  )

  const { error } = await admin.from('connect_accounts').update(
    {
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
      disabled_reason: null,
      last_stripe_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ).eq('profile_id', user.id)

  if (error) throw error

  return stripeAccountId
}

async function createTask(requesterId, helperId, title) {
  const taskId = randomUUID()

  const { error } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify transfer release.',
    category: 'Recados',
    price: 12.34,
    status: 'assigned',
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
  })

  if (error) throw error

  const { error: completeError } = await admin
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)

  if (completeError) throw completeError

  return taskId
}

async function createHeldPayment(taskId, requesterId, helperId, suffix) {
  const paymentId = randomUUID()
  const correlationId = randomUUID()
  const idempotencyKey = `release-${suffix}-${paymentId}`

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
    status: 'held',
    captured_at: new Date().toISOString(),
    held_at: new Date().toISOString(),
    correlation_id: correlationId,
    idempotency_key: idempotencyKey,
    reconciliation_status: 'reconciled',
    last_reconciled_at: new Date().toISOString(),
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

async function countWhere(table, filters = {}) {
  let query = admin.from(table).select('id')

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value)
  }

  const { data, error } = await query
  if (error) throw error
  return data?.length || 0
}

async function getSingle(table, filters = {}) {
  let query = admin.from(table).select('*')

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error
  return data
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function assertDenied(promise, label) {
  const { error, data } = await promise
  if (!error && typeof data !== 'undefined' && data !== null) {
    throw new Error(`${label}: expected denial, but received data.`)
  }
  if (!error) {
    throw new Error(`${label}: expected denial, but query succeeded.`)
  }
}

async function signIn(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error

  return data.session.access_token
}

async function withMockedTransferCreate(mockTransfer, callback) {
  const originalCreate = stripe.transfers.create

  stripe.transfers.create = async (params) => ({
    id: mockTransfer.id,
    amount: params.amount,
    currency: params.currency,
    destination: params.destination,
    description: params.description,
    metadata: params.metadata || {},
    transfer_group: params.transfer_group || null,
    balance_transaction: mockTransfer.balance_transaction || null,
  })

  try {
    return await callback()
  } finally {
    stripe.transfers.create = originalCreate
  }
}

async function runSuccessScenario(requester, helper, outsider) {
  const taskId = await createTask(requester.id, helper.id, 'Release success task')
  const payment = await createHeldPayment(taskId, requester.id, helper.id, 'success')

  const transferId = `tr_${randomUUID().slice(0, 24)}`
  const firstRelease = await withMockedTransferCreate(
    {
      id: transferId,
      balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    },
    () =>
      releasePaymentFunds({
        paymentId: payment.paymentId,
        requester: {
          id: requester.id,
          email: requester.email,
        },
      }),
  )

  assert(firstRelease.duplicate === false, 'First release should create a transfer.')
  assert(firstRelease.payment_status === 'transferring', 'Released payment should enter transferring.')

  const duplicateRelease = await releasePaymentFunds({
    paymentId: payment.paymentId,
    requester: {
      id: requester.id,
      email: requester.email,
    },
  })

  assert(duplicateRelease.duplicate === true, 'Second release should be idempotent.')
  assert(duplicateRelease.transfer_id === firstRelease.transfer_id, 'Duplicate release should reuse the same transfer row.')

  const transferCreatedEventId = `evt_transfer_created_${randomUUID().slice(0, 8)}`
  const transferPaidEventId = `evt_transfer_paid_${randomUUID().slice(0, 8)}`
  const transferReversedEventId = `evt_transfer_reversed_${randomUUID().slice(0, 8)}`

  const transferCreatedEvent = stripeEvent(transferCreatedEventId, 'transfer.created', {
    id: transferId,
    amount: 1200,
    currency: 'eur',
    metadata: {
      payment_id: payment.paymentId,
      task_id: taskId,
      correlation_id: payment.correlationId,
    },
  })

  await processStripeWebhookEvent(transferCreatedEvent)
  await processStripeWebhookEvent(transferCreatedEvent)

  let paymentRow = await getSingle('payments', { id: payment.paymentId })
  let taskRow = await getSingle('tasks', { id: taskId })
  let transferRow = await getSingle('transfers', { payment_id: payment.paymentId })

  assert(paymentRow?.status === 'transferring', 'transfer.created should keep the payment in transferring.')
  assert(taskRow?.status === 'completed', 'transfer.created must not close the task.')
  assert(transferRow?.status === 'pending', 'transfer.created should mirror a pending transfer.')
  assert((await countWhere('payment_ledger_entries', { payment_id: payment.paymentId, entry_type: 'transfer_created' })) === 1,
    'transfer.created should create one ledger entry.')
  assert((await countWhere('stripe_webhook_events', { stripe_event_id: transferCreatedEventId })) === 1,
    'transfer.created should be stored once in the webhook inbox.')
  assert((await countWhere('audit_events', { stripe_event_id: transferCreatedEventId })) === 1,
    'transfer.created should create one audit row.')

  const transferPaidEvent = stripeEvent(transferPaidEventId, 'transfer.paid', {
    id: transferId,
    amount: 1200,
    currency: 'eur',
    balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    metadata: {
      payment_id: payment.paymentId,
      task_id: taskId,
      correlation_id: payment.correlationId,
    },
  })

  await processStripeWebhookEvent(transferPaidEvent)
  await processStripeWebhookEvent(transferPaidEvent)

  paymentRow = await getSingle('payments', { id: payment.paymentId })
  taskRow = await getSingle('tasks', { id: taskId })
  transferRow = await getSingle('transfers', { payment_id: payment.paymentId })

  assert(paymentRow?.status === 'released', 'transfer.paid should release the payment.')
  assert(taskRow?.status === 'closed', 'transfer.paid should close the task.')
  assert(transferRow?.status === 'paid', 'transfer.paid should mirror a paid transfer.')
  assert((await countWhere('payment_ledger_entries', { payment_id: payment.paymentId, entry_type: 'transfer_paid' })) === 1,
    'transfer.paid should create one ledger entry.')
  assert((await countWhere('audit_events', { stripe_event_id: transferPaidEventId })) === 2,
    'transfer.paid should create two audit rows.')
  assert((await countWhere('audit_events', { stripe_event_id: transferPaidEventId, event_type: 'task_closed_after_transfer_paid' })) === 1,
    'transfer.paid should close the task once.')

  const transferReversedEvent = stripeEvent(transferReversedEventId, 'transfer.reversed', {
    id: transferId,
    amount: 1200,
    currency: 'eur',
    balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    metadata: {
      payment_id: payment.paymentId,
      task_id: taskId,
      correlation_id: payment.correlationId,
    },
  })

  await processStripeWebhookEvent(transferReversedEvent)
  await processStripeWebhookEvent(transferReversedEvent)

  paymentRow = await getSingle('payments', { id: payment.paymentId })
  taskRow = await getSingle('tasks', { id: taskId })
  transferRow = await getSingle('transfers', { payment_id: payment.paymentId })

  assert(paymentRow?.status === 'released', 'transfer.reversed should not reopen a closed payment.')
  assert(paymentRow?.reconciliation_status === 'needs_review', 'transfer.reversed should mark the payment for review.')
  assert(taskRow?.status === 'closed', 'transfer.reversed should keep the task closed.')
  assert(transferRow?.status === 'reversed', 'transfer.reversed should mirror a reversed transfer.')
  assert((await countWhere('payment_ledger_entries', { payment_id: payment.paymentId, entry_type: 'transfer_reversed' })) === 1,
    'transfer.reversed should create one ledger entry.')

  const requesterToken = await signIn(requester.email, requester.password)
  const helperToken = await signIn(helper.email, helper.password)
  const outsiderToken = await signIn(outsider.email, outsider.password)
  const requesterClient = createAuthedClient(requesterToken)
  const helperClient = createAuthedClient(helperToken)
  const outsiderClient = createAuthedClient(outsiderToken)

  const requesterTransfer = await requesterClient
    .from('transfers')
    .select('id, payment_id, status')
    .eq('payment_id', payment.paymentId)
    .maybeSingle()
  if (requesterTransfer.error) throw requesterTransfer.error
  assert(Boolean(requesterTransfer.data?.id), 'Requester should read their transfer.')

  const helperTransfer = await helperClient
    .from('transfers')
    .select('id, payment_id, status')
    .eq('payment_id', payment.paymentId)
    .maybeSingle()
  if (helperTransfer.error) throw helperTransfer.error
  assert(Boolean(helperTransfer.data?.id), 'Helper should read their transfer.')

  const outsiderTransfer = await outsiderClient
    .from('transfers')
    .select('id')
    .eq('payment_id', payment.paymentId)
    .maybeSingle()
  if (outsiderTransfer.error) throw outsiderTransfer.error
  assert(!outsiderTransfer.data, 'Outsider should not read transfer data.')

  await assertDenied(requesterClient.from('transfers').update({ status: 'paid' }).eq('payment_id', payment.paymentId), 'transfer update')
  await assertDenied(helperClient.from('transfers').delete().eq('payment_id', payment.paymentId), 'transfer delete')

  return {
    taskId,
    paymentId: payment.paymentId,
    eventIds: [transferCreatedEventId, transferPaidEventId, transferReversedEventId],
    transferId,
  }
}

async function runFailureScenario(requester, helper) {
  const taskId = await createTask(requester.id, helper.id, 'Release failed task')
  const payment = await createHeldPayment(taskId, requester.id, helper.id, 'failed')

  const release = await withMockedTransferCreate(
    {
      id: `tr_${randomUUID().slice(0, 24)}`,
      balance_transaction: `txn_${randomUUID().slice(0, 12)}`,
    },
    () =>
      releasePaymentFunds({
        paymentId: payment.paymentId,
        requester: {
          id: requester.id,
          email: requester.email,
        },
      }),
  )

  const transferFailedEventId = `evt_transfer_failed_${randomUUID().slice(0, 8)}`
  const transferFailedEvent = stripeEvent(transferFailedEventId, 'transfer.failed', {
    id: release.stripe_transfer_id,
    amount: 1200,
    currency: 'eur',
    failure_code: 'insufficient_funds',
    metadata: {
      payment_id: payment.paymentId,
      task_id: taskId,
      correlation_id: payment.correlationId,
    },
  })

  await processStripeWebhookEvent(transferFailedEvent)
  await processStripeWebhookEvent(transferFailedEvent)

  const paymentRow = await getSingle('payments', { id: payment.paymentId })
  const taskRow = await getSingle('tasks', { id: taskId })
  const transferRow = await getSingle('transfers', { payment_id: payment.paymentId })

  assert(paymentRow?.status === 'held', 'transfer.failed should return the payment to held.')
  assert(paymentRow?.reconciliation_status === 'needs_review', 'transfer.failed should mark the payment needs_review.')
  assert(taskRow?.status === 'completed', 'transfer.failed must not close the task.')
  assert(transferRow?.status === 'failed', 'transfer.failed should mirror a failed transfer.')
  assert((await countWhere('payment_ledger_entries', { payment_id: payment.paymentId, entry_type: 'transfer_failed' })) === 1,
    'transfer.failed should create one ledger entry.')
  assert((await countWhere('stripe_webhook_events', { stripe_event_id: transferFailedEventId })) === 1,
    'transfer.failed should be stored once in the webhook inbox.')

  return {
    taskId,
    paymentId: payment.paymentId,
    eventIds: [transferFailedEventId],
  }
}

async function cleanup(ids) {
  if (ids.paymentIds.length > 0) {
    await admin.from('audit_events').delete().in('entity_id', ids.paymentIds)
    await admin.from('payments').delete().in('id', ids.paymentIds)
  }

  if (ids.taskIds.length > 0) {
    await admin.from('audit_events').delete().in('entity_id', ids.taskIds)
    await admin.from('tasks').delete().in('id', ids.taskIds)
  }

  if (ids.eventIds.length > 0) {
    await admin.from('audit_events').delete().in('stripe_event_id', ids.eventIds)
    await admin.from('stripe_webhook_events').delete().in('stripe_event_id', ids.eventIds)
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
    const requester = await createTestUser('requester')
    const helper = await createTestUser('helper')
    const outsider = await createTestUser('outsider')

    ids.userIds.push(requester.id, helper.id, outsider.id)
    ids.profileIds.push(requester.id, helper.id, outsider.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper')
    await ensureProfile(outsider, 'outsider')

    await ensureConnectAccount(helper)

    const successScenario = await runSuccessScenario(requester, helper, outsider)
    const failureScenario = await runFailureScenario(requester, helper)

    ids.taskIds.push(successScenario.taskId, failureScenario.taskId)
    ids.paymentIds.push(successScenario.paymentId, failureScenario.paymentId)
    ids.eventIds.push(...successScenario.eventIds, ...failureScenario.eventIds)

    const requesterClient = createAuthedClient(await signIn(requester.email, requester.password))
    const helperClient = createAuthedClient(await signIn(helper.email, helper.password))
    const outsiderClient = createAuthedClient(await signIn(outsider.email, outsider.password))

    const requesterRead = await requesterClient
      .from('transfers')
      .select('id')
      .eq('payment_id', successScenario.paymentId)
      .maybeSingle()
    if (requesterRead.error) throw requesterRead.error
    assert(Boolean(requesterRead.data?.id), 'Requester should read the transfer for their payment.')

    const helperRead = await helperClient
      .from('transfers')
      .select('id')
      .eq('payment_id', successScenario.paymentId)
      .maybeSingle()
    if (helperRead.error) throw helperRead.error
    assert(Boolean(helperRead.data?.id), 'Helper should read the transfer for the related payment.')

    const outsiderRead = await outsiderClient
      .from('transfers')
      .select('id')
      .eq('payment_id', successScenario.paymentId)
      .maybeSingle()
    if (outsiderRead.error) throw outsiderRead.error
    assert(!outsiderRead.data, 'Outsider should not read transfer data.')

    console.log('Payment release checks passed.')
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    await cleanup(ids)
  }
}

main()
