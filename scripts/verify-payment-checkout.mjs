import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createTaskCheckout } from '../server/services/payments.service.js'

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
  const email = `payment-checkout-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Checkout ${label}`,
      name: `Checkout ${label}`,
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

async function ensureProfile(user, roleLabel, overrides = {}) {
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
      ...overrides,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}

async function ensureConnectAccount(profileId, active = true) {
  const stripeAccountId = `acct_${randomUUID().slice(0, 12)}`

  const { error } = await admin.from('connect_accounts').upsert(
    {
      profile_id: profileId,
      stripe_account_id: stripeAccountId,
      country: 'ES',
      default_currency: 'eur',
      charges_enabled: active,
      payouts_enabled: active,
      details_submitted: active,
      disabled_reason: active ? null : 'requirements.past_due',
      capabilities: active
        ? {
            card_payments: 'active',
            transfers: 'active',
          }
        : {},
      requirements: {},
      future_requirements: {},
      last_stripe_sync_at: new Date().toISOString(),
    },
    { onConflict: 'profile_id' },
  )

  if (error) throw error

  return stripeAccountId
}

async function createTask(requesterId, helperId, title, status = 'assigned') {
  const taskId = randomUUID()

  const { error } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify checkout creation.',
    category: 'Recados',
    price: 12.34,
    status,
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
  })

  if (error) throw error

  return taskId
}

async function getPayment(taskId) {
  const { data, error } = await admin.from('payments').select('*').eq('task_id', taskId).maybeSingle()

  if (error) throw error
  return data
}

async function assertRejects(promise, label, expectedMessagePart) {
  try {
    await promise
  } catch (error) {
    const message = String(error?.message || '')
    if (expectedMessagePart && !message.includes(expectedMessagePart)) {
      throw new Error(`${label}: unexpected error message: ${message}`)
    }
    return
  }

  throw new Error(`${label}: expected rejection but the operation succeeded.`)
}

async function main() {
  const ids = {
    userIds: [],
    profileIds: [],
    taskIds: [],
  }

  try {
    const requester = await createTestUser('requester')
    const helper = await createTestUser('helper')
    const outsider = await createTestUser('outsider')
    const inactiveHelper = await createTestUser('inactive-helper')

    ids.userIds.push(requester.id, helper.id, outsider.id, inactiveHelper.id)
    ids.profileIds.push(requester.id, helper.id, outsider.id, inactiveHelper.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper')
    await ensureProfile(outsider, 'outsider')
    await ensureProfile(inactiveHelper, 'inactive-helper')

    await ensureConnectAccount(helper.id, true)

    const taskId = await createTask(requester.id, helper.id, 'Checkout happy path task')
    const draftTaskId = await createTask(requester.id, helper.id, 'Checkout draft task', 'draft')
    const inactiveTaskId = await createTask(requester.id, inactiveHelper.id, 'Checkout inactive helper task')

    ids.taskIds.push(taskId, draftTaskId, inactiveTaskId)

    const firstCheckout = await createTaskCheckout({
      taskId,
      requester: {
        id: requester.id,
        email: requester.email,
      },
    })

    const firstPayment = await getPayment(taskId)
    if (!firstCheckout?.checkout_url?.includes('checkout.stripe.com')) {
      throw new Error('Checkout did not return a Stripe checkout URL.')
    }

    if (firstCheckout.payment_id !== firstPayment?.id) {
      throw new Error('Checkout did not persist the expected payment row.')
    }

    if (firstPayment?.status !== 'requires_checkout') {
      throw new Error('Checkout payment should stay in requires_checkout.')
    }

    if (!firstPayment?.stripe_checkout_session_id) {
      throw new Error('Checkout payment should store the Stripe checkout session id.')
    }

    const secondCheckout = await createTaskCheckout({
      taskId,
      requester: {
        id: requester.id,
        email: requester.email,
      },
    })

    if (secondCheckout.payment_id !== firstCheckout.payment_id) {
      throw new Error('Checkout should reuse the same payment row for the same task.')
    }

    if (secondCheckout.checkout_url !== firstCheckout.checkout_url) {
      throw new Error('Checkout should be idempotent for the same task.')
    }

    await assertRejects(
      createTaskCheckout({
        taskId,
        requester: {
          id: outsider.id,
          email: outsider.email,
        },
      }),
      'outsider checkout',
      'No puedes pagar una tarea ajena.',
    )

    await assertRejects(
      createTaskCheckout({
        taskId: draftTaskId,
        requester: {
          id: requester.id,
          email: requester.email,
        },
      }),
      'draft task checkout',
      'La tarea debe estar asignada antes de iniciar el pago.',
    )

    await assertRejects(
      createTaskCheckout({
        taskId: inactiveTaskId,
        requester: {
          id: requester.id,
          email: requester.email,
        },
      }),
      'inactive helper checkout',
      'Stripe Connect activo',
    )

    console.log('Payment checkout checks passed.')
  } catch (error) {
    console.error(error?.message || error)
    process.exitCode = 1
  } finally {
    if (ids.taskIds.length > 0) {
      await admin.from('payments').delete().in('task_id', ids.taskIds)
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
}

main()
