import { randomUUID } from 'node:crypto'
import { dirname, resolve } from 'node:path'
import { access } from 'node:fs/promises'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { stripe } from '../../server/services/stripe.service.js'

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

export const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
})

export const FINANCIAL_SMOKE_ARTIFACT = resolve(process.cwd(), 'tmp/stripe-smoke-result.json')
export const FINANCIAL_REPLAY_ARTIFACT = resolve(process.cwd(), 'tmp/stripe-webhook-replay-result.json')
export const FINANCIAL_INSPECT_ARTIFACT = resolve(process.cwd(), 'tmp/financial-inspection-result.json')
export const FINANCIAL_RECONCILE_ARTIFACT = resolve(process.cwd(), 'tmp/financial-reconciliation-result.json')
export const STRIPE_READINESS_ARTIFACT = resolve(process.cwd(), 'tmp/stripe-readiness-report.json')

export function sleep(ms) {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms)
  })
}

export function buildStripeEvent(eventId, type, object, account = null) {
  return {
    id: eventId,
    type,
    livemode: false,
    account,
    data: {
      object,
    },
  }
}

export async function createTestUser(label) {
  const email = `stripe-smoke-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `Stripe Smoke ${label}`,
      name: `Stripe Smoke ${label}`,
    },
  })

  if (error) throw error

  return {
    id: data.user.id,
    email,
    password,
  }
}

export async function deleteTestUser(userId) {
  if (!userId) return
  await admin.auth.admin.deleteUser(userId)
}

function buildUsernamePrefix(label) {
  const cleaned = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  return cleaned || 'user'
}

export async function ensureProfile(user, roleLabel, overrides = {}) {
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

export async function findActiveHelperFixture() {
  const { data, error } = await admin
    .from('connect_accounts')
    .select('profile_id, stripe_account_id, charges_enabled, payouts_enabled, details_submitted, disabled_reason, updated_at')
    .eq('charges_enabled', true)
    .eq('payouts_enabled', true)
    .eq('details_submitted', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data?.profile_id || !data?.stripe_account_id) {
    throw new Error('No active helper Connect account was found in Supabase test data.')
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, full_name, username, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', data.profile_id)
    .maybeSingle()

  if (profileError) throw profileError

  return {
    connectAccount: data,
    profile,
  }
}

export async function createTask({
  requesterId,
  helperId,
  title,
  description = 'Temporary task used for Stripe smoke validation.',
  status = 'assigned',
  price = 12.34,
}) {
  const taskId = randomUUID()

  const { error } = await admin.from('tasks').insert({
    id: taskId,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description,
    category: 'Recados',
    price,
    status,
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
  })

  if (error) throw error

  return taskId
}

export async function updateTaskStatus(taskId, status, extra = {}) {
  const { data, error } = await admin
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    })
    .eq('id', taskId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function getTaskById(taskId) {
  const { data, error } = await admin.from('tasks').select('*').eq('id', taskId).maybeSingle()

  if (error) throw error
  return data
}

export async function getPaymentByTaskId(taskId) {
  const { data, error } = await admin.from('payments').select('*').eq('task_id', taskId).maybeSingle()

  if (error) throw error
  return data
}

export async function getPaymentById(paymentId) {
  const { data, error } = await admin.from('payments').select('*').eq('id', paymentId).maybeSingle()

  if (error) throw error
  return data
}

export async function getTransferByPaymentId(paymentId) {
  const { data, error } = await admin.from('transfers').select('*').eq('payment_id', paymentId).maybeSingle()

  if (error) throw error
  return data
}

export async function getWebhookEventByStripeEventId(stripeEventId) {
  const { data, error } = await admin
    .from('stripe_webhook_events')
    .select('*')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getAuditEventsByStripeEventId(stripeEventId) {
  const { data, error } = await admin.from('audit_events').select('*').eq('stripe_event_id', stripeEventId)

  if (error) throw error
  return data || []
}

export async function getAuditEventsByPaymentId(paymentId) {
  const { data, error } = await admin
    .from('audit_events')
    .select('*')
    .eq('entity_type', 'payment')
    .eq('entity_id', String(paymentId))
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getAuditEventsByTaskId(taskId) {
  const { data, error } = await admin
    .from('audit_events')
    .select('*')
    .eq('entity_type', 'task')
    .eq('entity_id', String(taskId))
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getLedgerEntriesByPaymentId(paymentId) {
  const { data, error } = await admin
    .from('payment_ledger_entries')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getWebhookEventsByCorrelationId(correlationId) {
  const { data, error } = await admin
    .from('stripe_webhook_events')
    .select('*')
    .eq('correlation_id', correlationId)
    .order('received_at', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getWebhookEventsByStripeEventIds(stripeEventIds) {
  if (!Array.isArray(stripeEventIds) || stripeEventIds.length === 0) {
    return []
  }

  const { data, error } = await admin
    .from('stripe_webhook_events')
    .select('*')
    .in('stripe_event_id', stripeEventIds)

  if (error) throw error
  return data || []
}

export async function getConnectAccountByProfileId(profileId) {
  const { data, error } = await admin.from('connect_accounts').select('*').eq('profile_id', profileId).maybeSingle()

  if (error) throw error
  return data
}

export async function getPaymentsByTaskIds(taskIds) {
  const { data, error } = await admin.from('payments').select('*').in('task_id', taskIds)

  if (error) throw error
  return data || []
}

export async function getPaymentsByStatus(statuses) {
  const { data, error } = await admin.from('payments').select('*').in('status', statuses)

  if (error) throw error
  return data || []
}

export async function getStripeAccount(stripeAccountId) {
  if (!stripeAccountId) return null
  return stripe.accounts.retrieve(stripeAccountId)
}

export async function writeJsonFile(pathname, value) {
  const { mkdir, writeFile } = await import('node:fs/promises')
  await mkdir(dirname(pathname), { recursive: true })
  await writeFile(pathname, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

export async function readJsonFile(pathname) {
  const { readFile } = await import('node:fs/promises')
  const raw = await readFile(pathname, 'utf8')
  return JSON.parse(raw)
}

export async function readJsonFileIfExists(pathname) {
  try {
    await access(pathname)
  } catch {
    return null
  }

  return readJsonFile(pathname)
}

export function formatMoney(amountCents, currency = 'eur') {
  const amount = Number(amountCents || 0) / 100
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: String(currency || 'eur').toUpperCase(),
  }).format(amount)
}

export function formatIso(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString()
}

export function formatStatusBadge(label, value) {
  return `${label}: ${value ?? 'n/a'}`
}

export { stripe }
