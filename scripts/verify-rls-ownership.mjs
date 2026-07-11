// QA negativa para ownership RLS y escrituras sensibles.
//
//   pnpm run verify:rls-ownership
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
// Crea usuarios, profiles, tasks, payments, transfers, ledger/webhooks/audit y reviews
// temporales; se autolimpia al terminar.

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { releasePaymentFunds } from '../server/services/payments.service.js'

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

function rowCount(data) {
  return Array.isArray(data) ? data.length : data ? 1 : 0
}

function isBlocked(error, data) {
  return Boolean(error) || rowCount(data) === 0
}

function buildUsername(label) {
  return `${label}_${randomUUID().slice(0, 10).replace(/-/g, '')}`.toLowerCase().slice(0, 30)
}

async function createUser(label) {
  const email = `rls-owner-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `RLS Owner ${label}`, name: `RLS Owner ${label}` },
  })

  if (error) throw error
  return { id: data.user.id, email, password }
}

async function userClient(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return client
}

async function ensureProfile(user, label, overrides = {}) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      username: buildUsername(label),
      full_name: `${label} User`,
      display_name: `${label} User`,
      neighborhood: 'Test Area',
      account_status: 'active',
      rating: 0,
      completed_tasks: 0,
      reviews_count: 0,
      verified: false,
      helper_status: 'not_started',
      accepts_direct_requests: true,
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

async function createTask(ids, requesterId, helperId, status, title, { targetHelperId = null } = {}) {
  const id = randomUUID()
  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const { error } = await admin.from('tasks').insert({
    id,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify ownership RLS.',
    category: 'Recados',
    price: 12.34,
    status,
    is_direct_request: Boolean(targetHelperId),
    target_helper_id: targetHelperId,
    lat: 40.4168,
    lng: -3.7038,
    published_at: new Date().toISOString(),
    ...(status === 'open'
      ? {
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        timezone: 'Europe/Madrid',
      }
      : {}),
  })

  if (error) throw error
  ids.taskIds.push(id)
  return id
}

async function createPayment(ids, taskId, requesterId, helperId, status = 'held') {
  const id = randomUUID()
  const correlationId = randomUUID()
  const { error } = await admin.from('payments').insert({
    id,
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
    status,
    correlation_id: correlationId,
    idempotency_key: `rls-owner-payment-${id}`,
    reconciliation_status: 'pending',
    held_at: status === 'held' ? new Date().toISOString() : null,
    metadata: { source: 'verify-rls-ownership' },
  })

  if (error) throw error
  ids.paymentIds.push(id)
  return { id, correlationId }
}

async function createTransfer(ids, paymentId, requesterId, helperId) {
  const id = randomUUID()
  const { error } = await admin.from('transfers').insert({
    id,
    payment_id: paymentId,
    requester_profile_id: requesterId,
    helper_profile_id: helperId,
    amount_cents: 1200,
    currency: 'eur',
    status: 'pending',
    correlation_id: randomUUID(),
    idempotency_key: `rls-owner-transfer-${id}`,
    metadata: { source: 'verify-rls-ownership' },
  })

  if (error) throw error
  ids.transferIds.push(id)
  return id
}

async function createFinancialPrivateRows(ids, paymentId, requesterId, helperId, correlationId) {
  const webhookId = randomUUID()
  const ledgerId = randomUUID()
  const auditId = randomUUID()

  const { error: webhookError } = await admin.from('stripe_webhook_events').insert({
    id: webhookId,
    stripe_event_id: `evt_rls_owner_${randomUUID()}`,
    type: 'payment_intent.succeeded',
    livemode: false,
    payload: { id: webhookId, object: 'event' },
    payload_hash: randomUUID().replace(/-/g, ''),
    processing_status: 'processed',
    processed_at: new Date().toISOString(),
    correlation_id: correlationId,
  })
  if (webhookError) throw webhookError

  const { error: ledgerError } = await admin.from('payment_ledger_entries').insert({
    id: ledgerId,
    payment_id: paymentId,
    requester_profile_id: requesterId,
    helper_profile_id: helperId,
    entry_type: 'test_hold',
    direction: 'credit',
    account_code: 'test:escrow',
    amount_cents: 1234,
    platform_fee_cents: 34,
    helper_amount_cents: 1200,
    currency: 'eur',
    source_event_id: webhookId,
    correlation_id: correlationId,
    idempotency_key: `rls-owner-ledger-${ledgerId}`,
    metadata: { source: 'verify-rls-ownership' },
  })
  if (ledgerError) throw ledgerError

  const { error: auditError } = await admin.from('audit_events').insert({
    id: auditId,
    event_type: 'verify.rls_ownership',
    severity: 'info',
    actor_type: 'system',
    actor_profile_id: requesterId,
    entity_type: 'payment',
    entity_id: paymentId,
    correlation_id: correlationId,
    metadata: { source: 'verify-rls-ownership' },
  })
  if (auditError) throw auditError

  ids.webhookIds.push(webhookId)
  ids.ledgerIds.push(ledgerId)
  ids.auditIds.push(auditId)
}

async function fetchProfile(id, columns = 'id, full_name, rating, verified, account_status, completed_tasks, reviews_count, stripe_charges_enabled') {
  const { data, error } = await admin.from('profiles').select(columns).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

async function assertProtectedProfileColumn(client, profileId, column, attemptedValue, expectedValue) {
  const { data, error } = await client.from('profiles').update({ [column]: attemptedValue }).eq('id', profileId).select(column)
  const after = await fetchProfile(profileId, `id, ${column}`)
  const unchanged = after?.[column] === expectedValue
  record(
    `P-${column}`,
    `Owner no puede cambiar profiles.${column}`,
    isBlocked(error, data) && unchanged,
    error ? `bloqueado (${error.code || 'rls'})` : `filas=${rowCount(data)} valor=${after?.[column]}`,
  )
}

async function assertNoRead(client, table, id, label) {
  const { data, error } = await client.from(table).select('id').eq('id', id)
  record(label, `No se lee ${table} sin permiso`, Boolean(error) || rowCount(data) === 0, error ? `error ${error.code}` : `filas=${rowCount(data)}`)
}

async function assertRpcBlocked(client, fn, args, id, desc) {
  const { data, error } = await client.rpc(fn, args)
  record(id, desc, Boolean(error) || data === null, error ? `bloqueado (${error.code || 'rpc'})` : `data=${JSON.stringify(data)}`)
}

async function assertServiceBlocked(callback, id, desc) {
  try {
    const data = await callback()
    record(id, desc, false, `permitido ${JSON.stringify(data)}`)
  } catch (error) {
    record(id, desc, true, `bloqueado (${error?.message || 'service'})`)
  }
}

async function main() {
  const ids = {
    userIds: [],
    taskIds: [],
    paymentIds: [],
    transferIds: [],
    webhookIds: [],
    ledgerIds: [],
    auditIds: [],
    reviewIds: [],
    applicationIds: [],
  }

  try {
    const requester = await createUser('requester')
    const helper = await createUser('helper')
    const third = await createUser('third')
    ids.userIds.push(requester.id, helper.id, third.id)

    await ensureProfile(requester, 'requester', { helper_status: 'active' })
    await ensureProfile(helper, 'helper', { helper_status: 'active' })
    await ensureProfile(third, 'third', { helper_status: 'active' })

    const rc = await userClient(requester)
    const hc = await userClient(helper)
    const tc = await userClient(third)

    // profiles: sensitive columns stay backend-owned; normal self-service edit works.
    await assertProtectedProfileColumn(rc, requester.id, 'rating', 4.9, 0)
    await assertProtectedProfileColumn(rc, requester.id, 'verified', true, false)
    await assertProtectedProfileColumn(rc, requester.id, 'account_status', 'suspended', 'active')
    await assertProtectedProfileColumn(rc, requester.id, 'completed_tasks', 99, 0)
    await assertProtectedProfileColumn(rc, requester.id, 'reviews_count', 99, 0)
    await assertProtectedProfileColumn(rc, requester.id, 'stripe_charges_enabled', true, false)

    {
      const nextName = `Self Service ${randomUUID().slice(0, 6)}`
      const { data, error } = await rc.from('profiles').update({ full_name: nextName }).eq('id', requester.id).select('full_name')
      const after = await fetchProfile(requester.id, 'id, full_name')
      record('P-full_name', 'Owner sí puede cambiar profiles.full_name', !error && rowCount(data) === 1 && after?.full_name === nextName, error ? error.message : `full_name=${after?.full_name}`)
    }

    // financial privacy and write-lock.
    const heldTask = await createTask(ids, requester.id, null, 'open', 'RLS held payment delete guard')
    const { id: heldPaymentId, correlationId } = await createPayment(ids, heldTask, requester.id, helper.id, 'held')
    const transferId = await createTransfer(ids, heldPaymentId, requester.id, helper.id)
    await createFinancialPrivateRows(ids, heldPaymentId, requester.id, helper.id, correlationId)

    await assertNoRead(tc, 'payments', heldPaymentId, 'F-payments-read-third')
    await assertNoRead(tc, 'transfers', transferId, 'F-transfers-read-third')

    {
      const insertId = randomUUID()
      const { data, error } = await rc.from('payments').insert({
        id: insertId,
        task_id: heldTask,
        payer_id: requester.id,
        receiver_id: helper.id,
        amount: 1,
        platform_fee: 0,
        status: 'draft',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.paymentIds.push(insertId)
      record('F-payments-insert', 'Authenticated no puede insertar payments', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)
    }

    {
      const { data, error } = await rc.from('payments').update({ status: 'voided' }).eq('id', heldPaymentId).select('id, status')
      const { data: after, error: afterError } = await admin.from('payments').select('status').eq('id', heldPaymentId).maybeSingle()
      if (afterError) throw afterError
      record('F-payments-update', 'Authenticated no puede actualizar payments', isBlocked(error, data) && after?.status === 'held', error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} status=${after?.status}`)
    }

    {
      const { data, error } = await rc.from('payments').delete().eq('id', heldPaymentId).select('id')
      const { data: after, error: afterError } = await admin.from('payments').select('id').eq('id', heldPaymentId).maybeSingle()
      if (afterError) throw afterError
      record('F-payments-delete', 'Authenticated no puede borrar payments', isBlocked(error, data) && after?.id === heldPaymentId, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} existe=${Boolean(after)}`)
    }

    await assertNoRead(rc, 'payment_ledger_entries', ids.ledgerIds[0], 'F-ledger-read-auth')
    await assertNoRead(rc, 'stripe_webhook_events', ids.webhookIds[0], 'F-webhooks-read-auth')
    await assertNoRead(rc, 'audit_events', ids.auditIds[0], 'F-audit-read-auth')

    // tasks: deletes are narrow and cannot cascade active payments.
    {
      const { data, error } = await rc.from('tasks').delete().eq('id', heldTask).select('id')
      const { data: paymentAfter, error: paymentAfterError } = await admin.from('payments').select('id').eq('id', heldPaymentId).maybeSingle()
      if (paymentAfterError) throw paymentAfterError
      record('T-delete-held-payment', 'Requester no borra tarea con payment held', isBlocked(error, data) && paymentAfter?.id === heldPaymentId, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} payment=${Boolean(paymentAfter)}`)
    }

    {
      const foreignTask = await createTask(ids, requester.id, null, 'open', 'RLS foreign task delete')
      const { data, error } = await tc.from('tasks').delete().eq('id', foreignTask).select('id')
      const { data: after, error: afterError } = await admin.from('tasks').select('id').eq('id', foreignTask).maybeSingle()
      if (afterError) throw afterError
      record('T-delete-third', 'Tercero no borra tarea ajena', isBlocked(error, data) && after?.id === foreignTask, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} existe=${Boolean(after)}`)
    }

    // reviews: only requester -> helper after completed/closed, once.
    {
      const openReviewTask = await createTask(ids, requester.id, helper.id, 'open', 'RLS open review task')
      const { data, error } = await rc.from('reviews').insert({
        task_id: openReviewTask,
        reviewer_id: requester.id,
        reviewed_user_id: helper.id,
        rating: 5,
        communication_rating: 5,
        punctuality_rating: 5,
        trust_rating: 5,
        comment: 'Should not insert on open task',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.reviewIds.push(...data.map((row) => row.id))
      record('R-open-task', 'No se inserta review en tarea open', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)
    }

    const completedReviewTask = await createTask(ids, requester.id, helper.id, 'completed', 'RLS completed review task')
    {
      const { data, error } = await rc.from('reviews').insert({
        task_id: completedReviewTask,
        reviewer_id: requester.id,
        reviewed_user_id: helper.id,
        rating: 5,
        communication_rating: 5,
        punctuality_rating: 5,
        trust_rating: 5,
        comment: 'Valid setup review',
      }).select('id')

      if (error || rowCount(data) !== 1) throw new Error(`Could not create setup review: ${error?.message || '0 rows'}`)
      ids.reviewIds.push(data[0].id)

      const profileAfterReview = await fetchProfile(helper.id, 'id, rating, reviews_count, completed_tasks')
      record(
        'R-review-stats-trigger',
        'SECURITY DEFINER recompute_profile_review_stats actualiza columnas protegidas',
        Number(profileAfterReview?.rating) === 5 && profileAfterReview?.reviews_count === 1 && profileAfterReview?.completed_tasks >= 1,
        `rating=${profileAfterReview?.rating} reviews=${profileAfterReview?.reviews_count} completed=${profileAfterReview?.completed_tasks}`,
      )
    }

    {
      const { data, error } = await rc.from('reviews').insert({
        task_id: completedReviewTask,
        reviewer_id: requester.id,
        reviewed_user_id: helper.id,
        rating: 4,
        communication_rating: 4,
        punctuality_rating: 4,
        trust_rating: 4,
        comment: 'Duplicate should fail',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.reviewIds.push(...data.map((row) => row.id))
      record('R-duplicate', 'No se duplica review', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)
    }

    {
      const { data, error } = await tc.from('reviews').insert({
        task_id: completedReviewTask,
        reviewer_id: third.id,
        reviewed_user_id: helper.id,
        rating: 5,
        communication_rating: 5,
        punctuality_rating: 5,
        trust_rating: 5,
        comment: 'Third-party review should fail',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.reviewIds.push(...data.map((row) => row.id))
      record('R-third', 'No-requester no inserta review', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)
    }

    // task_applications: direct insert is blocked for own task, non-open task, and duplicate active application.
    {
      const ownTask = await createTask(ids, requester.id, null, 'open', 'RLS own apply task')
      const { data, error } = await rc.from('task_applications').insert({
        task_id: ownTask,
        helper_id: requester.id,
        message: 'Own task direct apply should fail',
        status: 'pending',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.applicationIds.push(...data.map((row) => row.id))
      record('A-own-task', 'Direct apply a tarea propia bloqueado', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)

      await assertRpcBlocked(
        rc,
        'apply_to_task',
        { p_task_id: ownTask, p_message: 'Own task RPC apply should fail' },
        'A-rpc-own-task',
        'RPC apply_to_task a tarea propia bloqueado',
      )
    }

    {
      const assignedTask = await createTask(ids, requester.id, third.id, 'assigned', 'RLS non-open apply task')
      const { data, error } = await hc.from('task_applications').insert({
        task_id: assignedTask,
        helper_id: helper.id,
        message: 'Non-open direct apply should fail',
        status: 'pending',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.applicationIds.push(...data.map((row) => row.id))
      record('A-non-open-task', 'Direct apply a tarea no-open bloqueado', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)

      await assertRpcBlocked(
        hc,
        'apply_to_task',
        { p_task_id: assignedTask, p_message: 'Non-open RPC apply should fail' },
        'A-rpc-non-open-task',
        'RPC apply_to_task a tarea no-open bloqueado',
      )
    }

    {
      const duplicateTask = await createTask(ids, requester.id, null, 'open', 'RLS duplicate apply task')
      const existingAppId = randomUUID()
      const { error: setupError } = await admin.from('task_applications').insert({
        id: existingAppId,
        task_id: duplicateTask,
        helper_id: helper.id,
        message: 'Existing active application',
        status: 'pending',
      })
      if (setupError) throw setupError
      ids.applicationIds.push(existingAppId)

      const { data, error } = await hc.from('task_applications').insert({
        task_id: duplicateTask,
        helper_id: helper.id,
        message: 'Duplicate direct apply should fail',
        status: 'pending',
      }).select('id')
      if (!error && rowCount(data) > 0) ids.applicationIds.push(...data.map((row) => row.id))
      record('A-duplicate', 'Direct double apply bloqueado', Boolean(error) || rowCount(data) === 0, error ? `bloqueado (${error.code})` : `filas=${rowCount(data)}`)

      await assertRpcBlocked(
        hc,
        'apply_to_task',
        { p_task_id: duplicateTask, p_message: 'Duplicate RPC apply should fail' },
        'A-rpc-duplicate',
        'RPC double apply bloqueado',
      )

      await assertRpcBlocked(
        tc,
        'withdraw_task_application',
        { p_application_id: existingAppId },
        'A-rpc-withdraw-foreign',
        'RPC withdraw_task_application sobre oferta ajena bloqueado',
      )
    }

    {
      const foreignOwnerTask = await createTask(ids, third.id, null, 'open', 'RLS foreign select task')
      const foreignAppId = randomUUID()
      const { error: setupError } = await admin.from('task_applications').insert({
        id: foreignAppId,
        task_id: foreignOwnerTask,
        helper_id: helper.id,
        message: 'Foreign owner application',
        status: 'pending',
      })
      if (setupError) throw setupError
      ids.applicationIds.push(foreignAppId)

      await assertRpcBlocked(
        rc,
        'select_task_helper',
        { p_application_id: foreignAppId },
        'A-rpc-select-foreign',
        'Requester no acepta helper fuera de su task',
      )
    }

    // Direct tasks are private: only the requester and invited helper can see or answer them.
    {
      const directTask = await createTask(
        ids,
        requester.id,
        null,
        'open',
        'RLS direct task privacy',
        { targetHelperId: helper.id },
      )

      await assertNoRead(tc, 'tasks', directTask, 'D-read-third')

      {
        const { data, error } = await hc.from('tasks').select('id').eq('id', directTask)
        record(
          'D-read-target',
          'Helper invitado sí puede leer su solicitud directa',
          !error && rowCount(data) === 1,
          error ? `error ${error.code}` : `filas=${rowCount(data)}`,
        )
      }

      await assertRpcBlocked(
        tc,
        'apply_to_task',
        { p_task_id: directTask, p_message: 'Direct task bypass should fail' },
        'D-apply-blocked',
        'Nadie puede aplicar a una solicitud directa por apply_to_task',
      )

      await assertRpcBlocked(
        tc,
        'respond_to_direct_task',
        { p_task_id: directTask, p_response: 'accept' },
        'D-respond-third',
        'Tercero no puede responder una solicitud directa',
      )

      {
        const { data, error } = await hc
          .from('tasks')
          .update({ status: 'assigned', accepted_by: helper.id, direct_request_response: 'accepted' })
          .eq('id', directTask)
          .select('id')
        const { data: after, error: afterError } = await admin
          .from('tasks')
          .select('status, accepted_by, direct_request_response')
          .eq('id', directTask)
          .maybeSingle()
        if (afterError) throw afterError
        record(
          'D-direct-update-blocked',
          'Helper invitado no fuerza aceptación por UPDATE directo',
          isBlocked(error, data) && after?.status === 'open' && after?.accepted_by === null && after?.direct_request_response === null,
          error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} status=${after?.status}`,
        )
      }

      const { data, error } = await hc.rpc('respond_to_direct_task', {
        p_task_id: directTask,
        p_response: 'accept',
      })
      record(
        'D-respond-target',
        'Helper invitado acepta su solicitud directa',
        !error && data?.status === 'assigned' && data?.accepted_by === helper.id,
        error ? `error ${error.code}` : `status=${data?.status}`,
      )
    }

    // task completion / release / chat unlock cannot be forced out of state.
    {
      const assignedToComplete = await createTask(ids, requester.id, helper.id, 'assigned', 'RLS invalid complete task')
      const { data, error } = await rc.from('tasks').update({ status: 'completed' }).eq('id', assignedToComplete).select('id, status')
      const { data: after, error: afterError } = await admin.from('tasks').select('status').eq('id', assignedToComplete).maybeSingle()
      if (afterError) throw afterError
      record('T-complete-assigned', 'Requester no cierra tarea assigned desde cliente', isBlocked(error, data) && after?.status === 'assigned', error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} status=${after?.status}`)
    }

    {
      const completedToClose = await createTask(ids, requester.id, helper.id, 'completed', 'RLS invalid close task')
      const { data, error } = await rc.from('tasks').update({ status: 'closed' }).eq('id', completedToClose).select('id, status')
      const { data: after, error: afterError } = await admin.from('tasks').select('status').eq('id', completedToClose).maybeSingle()
      if (afterError) throw afterError
      record('T-close-client', 'Requester no fuerza status closed desde cliente', isBlocked(error, data) && after?.status === 'completed', error ? `bloqueado (${error.code})` : `filas=${rowCount(data)} status=${after?.status}`)
    }

    await assertServiceBlocked(
      () =>
        releasePaymentFunds({
          paymentId: heldPaymentId,
          requester: { id: third.id, email: third.email },
        }),
      'F-release-foreign',
      'Backend releasePaymentFunds bloquea requester ajeno',
    )

    await assertServiceBlocked(
      () =>
        releasePaymentFunds({
          paymentId: heldPaymentId,
          requester: { id: requester.id, email: requester.email },
        }),
      'F-release-invalid-state',
      'Backend releasePaymentFunds bloquea tarea no completed',
    )

    {
      const prePaymentChatTask = await createTask(ids, requester.id, helper.id, 'assigned', 'RLS pre-payment chat task')
      const { data: conversationId, error } = await rc.rpc('create_or_get_task_conversation', { p_task_id: prePaymentChatTask })
      if (error) throw error

      const { data: canAccess, error: accessError } = await rc.rpc('can_access_conversation', { p_conversation_id: conversationId })
      const { data: sent, error: sendError } = await rc.rpc('send_message', {
        p_conversation_id: conversationId,
        p_body: 'pre-payment bypass',
      })
      record(
        'C-chat-pre-payment',
        'Chat de tarea assigned no se desbloquea sin pago/tarea válida',
        !accessError && canAccess === false && (Boolean(sendError) || sent === null),
        `can_access=${canAccess} send=${sendError ? sendError.code || 'blocked' : 'allowed'}`,
      )
    }
  } catch (error) {
    record('SETUP', 'Error de preparación', false, error?.message || String(error))
  } finally {
    if (ids.reviewIds.length) await admin.from('reviews').delete().in('id', ids.reviewIds)
    if (ids.applicationIds.length) await admin.from('task_applications').delete().in('id', ids.applicationIds)
    if (ids.taskIds.length) await admin.from('task_applications').delete().in('task_id', ids.taskIds)
    if (ids.ledgerIds.length) await admin.from('payment_ledger_entries').delete().in('id', ids.ledgerIds)
    if (ids.transferIds.length) await admin.from('transfers').delete().in('id', ids.transferIds)
    if (ids.auditIds.length) await admin.from('audit_events').delete().in('id', ids.auditIds)
    if (ids.webhookIds.length) await admin.from('stripe_webhook_events').delete().in('id', ids.webhookIds)
    if (ids.paymentIds.length) await admin.from('payments').delete().in('id', ids.paymentIds)
    if (ids.taskIds.length) {
      await admin.from('conversations').delete().in('task_id', ids.taskIds)
      await admin.from('chats').delete().in('task_id', ids.taskIds)
      await admin.from('tasks').delete().in('id', ids.taskIds)
    }
    if (ids.userIds.length) {
      await admin.from('profiles').delete().in('id', ids.userIds)
      for (const uid of ids.userIds) await admin.auth.admin.deleteUser(uid)
    }
  }

  const failed = results.filter((result) => !result.pass)
  console.log('\n--- RESUMEN ---')
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)
  if (failed.length) {
    console.log('Fallaron:', failed.map((result) => result.id).join(', '))
    process.exitCode = 1
  } else {
    console.log('RLS ownership: todos los gates se comportan como se espera.')
  }
}

main()
