// QA de comportamiento RLS para la migración 0040 (payment-gate).
// Equivalente ejecutable de supabase/validation/0040_rls_validation.sql tests 1-12:
// en vez de leer pg_policies, prueba el GATE con sesiones de usuario REALES
// (anon key + JWT), que sí quedan sujetas a RLS. Si una operación prohibida falla
// para un usuario autenticado, el gate funciona pase lo que pase en las policies.
//
//   pnpm run verify:rls-payment-gate
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Crea y borra usuarios/tasks/conversaciones/aplicaciones de test; se autolimpia.

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const results = []
function record(id, desc, pass, detail = '') {
  results.push({ id, desc, pass, detail })
  const tag = pass ? 'PASS' : 'FAIL'
  console.log(`[${tag}] ${id} · ${desc}${detail ? ` — ${detail}` : ''}`)
}

// --- setup helpers -----------------------------------------------------------------

async function createUser(label) {
  const email = `rls-gate-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS ${label}`, name: `RLS ${label}` },
  })
  if (error) throw error
  return { id: data.user.id, email, password }
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
      ...overrides,
    },
    { onConflict: 'id' },
  )
  if (error) throw error
}

async function createTask(requesterId, helperId, status, title) {
  const id = randomUUID()
  const { error } = await admin.from('tasks').insert({
    id,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'RLS gate test task.',
    category: 'Recados',
    price: 12.34,
    status,
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
  })
  if (error) throw error
  return id
}

async function createTaskConversation(taskId, requesterId, helperId) {
  const id = randomUUID()
  const { error } = await admin
    .from('conversations')
    .insert({ id, created_by: requesterId, conversation_type: 'task', task_id: taskId })
  if (error) throw error
  const { error: partError } = await admin.from('conversation_participants').insert([
    { conversation_id: id, user_id: requesterId },
    { conversation_id: id, user_id: helperId },
  ])
  if (partError) throw partError
  return id
}

async function createLegacyChat(taskId, user1, user2) {
  const id = randomUUID()
  const { error } = await admin.from('chats').insert({ id, task_id: taskId, user1_id: user1, user2_id: user2 })
  if (error) throw error
  return id
}

async function userClient(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return client
}

// --- main --------------------------------------------------------------------------

async function main() {
  const ids = { userIds: [], taskIds: [], convoIds: [], chatIds: [] }

  try {
    const requester = await createUser('requester')
    const helper = await createUser('helper')
    const third = await createUser('third')
    ids.userIds.push(requester.id, helper.id, third.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper', { helper_status: 'active' })
    await ensureProfile(third, 'third')

    // Tareas
    const chatTask = await createTask(requester.id, helper.id, 'assigned', 'RLS chat-gate task')
    const legacyTask = await createTask(requester.id, helper.id, 'assigned', 'RLS legacy chat task')
    const taskSelect = await createTask(requester.id, null, 'open', 'RLS select task')
    const taskReject = await createTask(requester.id, null, 'open', 'RLS reject task')
    const taskWithdraw = await createTask(requester.id, null, 'open', 'RLS withdraw task')
    ids.taskIds.push(chatTask, legacyTask, taskSelect, taskReject, taskWithdraw)

    const convo = await createTaskConversation(chatTask, requester.id, helper.id)
    ids.convoIds.push(convo)
    const legacyChat = await createLegacyChat(legacyTask, requester.id, helper.id)
    ids.chatIds.push(legacyChat)

    const rc = await userClient(requester)
    const hc = await userClient(helper)
    const tc = await userClient(third)

    // T1 · ❌ crear chat legacy
    {
      const { error } = await rc.from('chats').insert({ user1_id: requester.id, user2_id: helper.id }).select()
      record('T1', 'No se puede crear chat legacy', Boolean(error), error ? `bloqueado (${error.code || 'rls'})` : 'INSERT permitido ⚠')
    }

    // T2 · ❌ mensaje solo con chat_id (rama legacy eliminada en 0040)
    {
      const { error } = await rc
        .from('messages')
        .insert({ chat_id: legacyChat, sender_id: requester.id, body: 'bypass', content: 'bypass', message_type: 'text' })
        .select()
      record('T2', 'No se puede insertar mensaje con solo chat_id', Boolean(error), error ? `bloqueado (${error.code || 'rls'})` : 'INSERT permitido ⚠')
    }

    // T3 · ❌ mensaje en tarea assigned (pre-pago)
    {
      const { error } = await rc
        .from('messages')
        .insert({ conversation_id: convo, sender_id: requester.id, body: 'pre-pago', content: 'pre-pago', message_type: 'text' })
        .select()
      record('T3', 'No se puede chatear en tarea assigned (pre-pago)', Boolean(error), error ? `bloqueado (${error.code || 'rls'})` : 'INSERT permitido ⚠')
    }

    // T4 · ❌ requester mueve tarea a in_progress
    // Bloqueado = denegación RLS (42501) O 0 filas afectadas; en ambos casos NO transiciona.
    {
      const { data, error } = await rc.from('tasks').update({ status: 'in_progress' }).eq('id', chatTask).select()
      const blocked = error?.code === '42501' || (!error && (data?.length || 0) === 0)
      const { data: after } = await admin.from('tasks').select('status').eq('id', chatTask).maybeSingle()
      record('T4', 'Requester no mueve tarea a in_progress', blocked && after?.status === 'assigned', error ? `denegado RLS (${error.code})` : `filas afectadas: ${data?.length || 0}; status=${after?.status}`)
    }

    // T5 · ❌ helper mueve tarea a in_progress
    {
      const { data, error } = await hc.from('tasks').update({ status: 'in_progress' }).eq('id', chatTask).select()
      const blocked = error?.code === '42501' || (!error && (data?.length || 0) === 0)
      const { data: after } = await admin.from('tasks').select('status').eq('id', chatTask).maybeSingle()
      record('T5', 'Helper no mueve tarea a in_progress', blocked && after?.status === 'assigned', error ? `denegado RLS (${error.code})` : `filas afectadas: ${data?.length || 0}; status=${after?.status}`)
    }

    // T8 · ✅ apply_to_task (lo adelantamos: T6 necesita una aplicación pending)
    let selectAppId = null
    {
      const { data, error } = await hc.rpc('apply_to_task', { p_task_id: taskSelect, p_message: 'Puedo ayudar' })
      const row = Array.isArray(data) ? data[0] : data
      selectAppId = row?.id || null
      record('T8', 'RPC apply_to_task (helper se ofrece)', !error && row?.status === 'pending', error ? error.message : `status=${row?.status}`)
    }

    // T6 · ❌ update directo de task_applications (auto-seleccionarse)
    {
      const { data, error } = await hc
        .from('task_applications')
        .update({ status: 'selected' })
        .eq('task_id', taskSelect)
        .eq('helper_id', helper.id)
        .select()
      const blocked = !error && (data?.length || 0) === 0
      record('T6', 'No auto-seleccionar candidatura por UPDATE directo', blocked, error ? `error ${error.code}` : `filas afectadas: ${data?.length || 0}`)
    }

    // T7 · ❌ tercero lee la conversación/mensajes
    {
      const { data: convos } = await tc.from('conversations').select('id').eq('id', convo)
      const { data: msgs } = await tc.from('messages').select('id').eq('conversation_id', convo)
      const blocked = (convos?.length || 0) === 0 && (msgs?.length || 0) === 0
      record('T7', 'Tercero no lee conversación ajena', blocked, `convos=${convos?.length || 0} msgs=${msgs?.length || 0}`)
    }

    // T9 · ✅ select_task_helper (requester elige)
    {
      const { data, error } = await rc.rpc('select_task_helper', { p_application_id: selectAppId })
      const row = Array.isArray(data) ? data[0] : data
      record('T9', 'RPC select_task_helper (requester elige)', !error && row?.status === 'assigned' && row?.accepted_by === helper.id, error ? error.message : `status=${row?.status}`)
    }

    // T10 · ✅ reject_task_application
    {
      const { data: applied } = await hc.rpc('apply_to_task', { p_task_id: taskReject, p_message: 'apply reject' })
      const appId = (Array.isArray(applied) ? applied[0] : applied)?.id
      const { data, error } = await rc.rpc('reject_task_application', { p_application_id: appId })
      const row = Array.isArray(data) ? data[0] : data
      record('T10', 'RPC reject_task_application (requester rechaza)', !error && row?.status === 'rejected', error ? error.message : `status=${row?.status}`)
    }

    // T11 · ✅ withdraw_task_application
    {
      const { data: applied } = await hc.rpc('apply_to_task', { p_task_id: taskWithdraw, p_message: 'apply withdraw' })
      const appId = (Array.isArray(applied) ? applied[0] : applied)?.id
      const { data, error } = await hc.rpc('withdraw_task_application', { p_application_id: appId })
      const row = Array.isArray(data) ? data[0] : data
      record('T11', 'RPC withdraw_task_application (helper retira)', !error && row?.status === 'withdrawn', error ? error.message : `status=${row?.status}`)
    }

    // T12 · ✅ chat se desbloquea cuando la tarea pasa a in_progress (simula post-webhook)
    {
      const { error: upErr } = await admin.from('tasks').update({ status: 'in_progress' }).eq('id', chatTask)
      if (upErr) throw upErr
      const { data: canAccess, error: caErr } = await rc.rpc('can_access_conversation', { p_conversation_id: convo })
      const { data: inserted, error: insErr } = await rc
        .from('messages')
        .insert({ conversation_id: convo, sender_id: requester.id, body: 'ahora sí', content: 'ahora sí', message_type: 'text' })
        .select()
      const ok = !caErr && canAccess === true && !insErr && (inserted?.length || 0) === 1
      record('T12', 'Chat se desbloquea con tarea in_progress', ok, `can_access=${canAccess} insert=${insErr ? insErr.code : 'ok'}`)
    }
  } catch (error) {
    record('SETUP', 'Error de preparación', false, error?.message || String(error))
  } finally {
    // cleanup en orden de FK
    if (ids.convoIds.length) {
      await admin.from('messages').delete().in('conversation_id', ids.convoIds)
      await admin.from('conversation_participants').delete().in('conversation_id', ids.convoIds)
      await admin.from('conversations').delete().in('id', ids.convoIds)
    }
    if (ids.taskIds.length) {
      await admin.from('task_applications').delete().in('task_id', ids.taskIds)
      await admin.from('conversations').delete().in('task_id', ids.taskIds)
      await admin.from('tasks').delete().in('id', ids.taskIds)
    }
    if (ids.chatIds.length) {
      await admin.from('messages').delete().in('chat_id', ids.chatIds)
      await admin.from('chats').delete().in('id', ids.chatIds)
    }
    if (ids.userIds.length) {
      await admin.from('profiles').delete().in('id', ids.userIds)
      for (const uid of ids.userIds) await admin.auth.admin.deleteUser(uid)
    }
  }

  const failed = results.filter((r) => !r.pass)
  console.log('\n--- RESUMEN ---')
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)
  if (failed.length) {
    console.log('Fallaron:', failed.map((r) => r.id).join(', '))
    process.exitCode = 1
  } else {
    console.log('RLS payment-gate: todos los gates se comportan como se espera.')
  }
}

main()
