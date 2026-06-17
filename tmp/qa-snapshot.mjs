// Snapshot de conteos para QA: baseline antes/después de verify:webhook-reliability.
// Detecta huérfanos comparando ambos. No modifica nada.
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const admin = createClient(process.env.SUPABASE_URL.trim(), process.env.SUPABASE_SERVICE_ROLE_KEY.trim(), {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const TABLES = ['profiles', 'tasks', 'payments', 'payment_ledger_entries', 'stripe_webhook_events', 'audit_events', 'conversations', 'task_applications', 'chats', 'messages']

async function count(table) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true })
  if (error) return `ERR(${error.message})`
  return count
}

async function listTestArtifacts() {
  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const testUsers = (users?.users || []).filter((u) => /wh-reliability-|stripe-layer-|rls-gate-/.test(u.email || ''))
  const { data: testEvents } = await admin
    .from('stripe_webhook_events')
    .select('stripe_event_id')
    .or('stripe_event_id.like.evt_stuck_%,stripe_event_id.like.evt_stale_%,stripe_event_id.like.evt_failed_%,stripe_event_id.like.evt_concurrent_%')
  return { testUsers: testUsers.map((u) => u.email), testEvents: (testEvents || []).map((e) => e.stripe_event_id) }
}

const counts = {}
for (const t of TABLES) counts[t] = await count(t)
const artifacts = await listTestArtifacts()

console.log(JSON.stringify({ at: new Date().toISOString(), counts, leftover: artifacts }, null, 2))
