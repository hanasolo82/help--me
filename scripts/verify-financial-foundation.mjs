import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

const REQUIRED = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
}

for (const [key, value] of Object.entries(REQUIRED)) {
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
  const email = `financial-foundation-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Financial ${label}`,
      name: `Financial ${label}`,
    },
  })

  if (error) throw error

  return {
    id: data.user.id,
    email,
    password,
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
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  }
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

async function ensureTask(requesterId, helperId) {
  const taskId = randomUUID()

  const { error } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requesterId,
    accepted_by: helperId,
    title: 'Financial foundation smoke task',
    description: 'Temporary task used to verify financial RLS boundaries.',
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

async function ensurePayment(taskId, requesterId, helperId) {
  const paymentId = randomUUID()
  const correlationId = randomUUID()
  const idempotencyKey = `foundation-${paymentId}`

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
      scenario: 'financial-foundation',
    },
  })

  if (error) throw error

  return {
    id: paymentId,
    taskId,
    requesterId,
    helperId,
    correlationId,
    idempotencyKey,
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

async function assertEmpty(promise, label) {
  const { error, data } = await promise
  if (error) {
    const message = String(error.message || '')
    if (/permission denied|row level security|not authorized/i.test(message)) {
      return
    }
    throw new Error(`${label}: unexpected error: ${message}`)
  }
  if (Array.isArray(data) && data.length > 0) {
    throw new Error(`${label}: expected zero rows, got ${data.length}.`)
  }
  if (data && !Array.isArray(data)) {
    throw new Error(`${label}: expected zero rows, got a single row.`)
  }
}

async function main() {
  const requester = await createTestUser('requester')
  const helper = await createTestUser('helper')
  const thirdParty = await createTestUser('third')

  await ensureProfile(requester, 'requester')
  await ensureProfile(helper, 'helper')
  await ensureProfile(thirdParty, 'third')

  const taskId = await ensureTask(requester.id, helper.id)
  const payment = await ensurePayment(taskId, requester.id, helper.id)

  const requesterSession = await signIn(requester.email, requester.password)
  const helperSession = await signIn(helper.email, helper.password)
  const thirdSession = await signIn(thirdParty.email, thirdParty.password)

  const requesterClient = createAuthedClient(requesterSession.accessToken)
  const helperClient = createAuthedClient(helperSession.accessToken)
  const thirdClient = createAuthedClient(thirdSession.accessToken)

  await assertDenied(
    requesterClient.from('payments').insert({
      task_id: taskId,
      payer_id: requester.id,
      receiver_id: helper.id,
      requester_profile_id: requester.id,
      helper_profile_id: helper.id,
      amount: 1,
      platform_fee: 0,
      amount_cents: 100,
      platform_fee_cents: 0,
      helper_amount_cents: 100,
      currency: 'eur',
      status: 'draft',
      correlation_id: randomUUID(),
      idempotency_key: `insert-${randomUUID()}`,
      reconciliation_status: 'pending',
    }),
    'payments insert',
  )

  await assertDenied(
    requesterClient.from('payments').update({ status: 'captured' }).eq('id', payment.id),
    'payments update',
  )

  await assertDenied(requesterClient.from('payments').delete().eq('id', payment.id), 'payments delete')

  await assertEmpty(requesterClient.from('payment_ledger_entries').select('*').eq('payment_id', payment.id), 'ledger read')
  await assertEmpty(requesterClient.from('stripe_webhook_events').select('*').limit(1), 'webhook inbox read')
  await assertEmpty(requesterClient.from('audit_events').select('*').limit(1), 'audit log read')

  const requesterRead = await requesterClient.from('payments').select('id, task_id, requester_profile_id, helper_profile_id').eq('id', payment.id).maybeSingle()
  if (requesterRead.error) throw requesterRead.error
  if (!requesterRead.data?.id) {
    throw new Error('Requester could not read their own payment.')
  }

  const helperRead = await helperClient.from('payments').select('id, task_id, requester_profile_id, helper_profile_id').eq('id', payment.id).maybeSingle()
  if (helperRead.error) throw helperRead.error
  if (!helperRead.data?.id) {
    throw new Error('Helper could not read a related payment.')
  }

  const thirdRead = await thirdClient.from('payments').select('id').eq('id', payment.id).maybeSingle()
  if (thirdRead.error) throw thirdRead.error
  if (thirdRead.data) {
    throw new Error('Third party unexpectedly read a financial row.')
  }

  await admin.from('payments').delete().eq('id', payment.id)
  await admin.from('tasks').delete().eq('id', taskId)
  await admin.from('profiles').delete().in('id', [requester.id, helper.id, thirdParty.id])
  await admin.auth.admin.deleteUser(requester.id)
  await admin.auth.admin.deleteUser(helper.id)
  await admin.auth.admin.deleteUser(thirdParty.id)

  console.log('Financial foundation checks passed.')
}

main().catch(async (error) => {
  console.error(error?.message || error)
  process.exitCode = 1
})
