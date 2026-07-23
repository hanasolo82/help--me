// Verificacion del modelo de conservacion de chats de tarea.
//
//   pnpm run verify:chat-retention
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY. Crea fixtures aislados y los elimina al terminar.

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const AS_OF = new Date('2030-01-01T12:00:00.000Z')

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const results = []

function record(id, description, pass, detail = '') {
  results.push({ id, description, pass, detail })
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} · ${description}${detail ? ` — ${detail}` : ''}`)
}

function username(label) {
  return `chat_retention_${label}_${randomUUID().slice(0, 10).replace(/-/g, '')}`.toLowerCase().slice(0, 30)
}

function isoDaysBefore(days) {
  return new Date(AS_OF.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
}

function isBlocked(error, data) {
  return Boolean(error) || (Array.isArray(data) ? data.length === 0 : !data)
}

function rowFor(rows, conversationId) {
  return (rows || []).find((row) => row.conversation_id === conversationId)
}

function hasExpectedSchedule(row, retentionStartedAt) {
  const startedAt = new Date(retentionStartedAt).getTime()
  return new Date(row?.retention_started_at).getTime() === startedAt
    && new Date(row?.attachments_purge_after).getTime() === startedAt + 180 * 24 * 60 * 60 * 1000
    && new Date(row?.messages_purge_after).getTime() === startedAt + 365 * 24 * 60 * 60 * 1000
}

async function createUser(label) {
  const email = `chat-retention-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Chat retention ${label}` },
  })
  if (error) throw error
  return { id: data.user.id, email, password }
}

async function createUserClient(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return client
}

async function ensureProfile(user, label, helper = false) {
  const { error } = await admin.from('profiles').upsert({
    id: user.id,
    username: username(label),
    full_name: `Chat retention ${label}`,
    neighborhood: 'Test Area',
    account_status: 'active',
    rating: 0,
    completed_tasks: 0,
    reviews_count: 0,
    verified: false,
    helper_status: helper ? 'active' : 'not_started',
  }, { onConflict: 'id' })
  if (error) throw error
}

async function createTask(ids, requesterId, helperId, status, title, timestamps = {}) {
  const id = randomUUID()
  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const { error } = await admin.from('tasks').insert({
    id,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify chat-retention scheduling.',
    category: 'Recados',
    price: 12.34,
    status,
    lat: 40.4168,
    lng: -3.7038,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone: 'Europe/Madrid',
    published_at: new Date().toISOString(),
    ...timestamps,
  })
  if (error) throw error
  ids.taskIds.push(id)
  return id
}

async function updateTask(taskId, values) {
  const { error } = await admin.from('tasks').update(values).eq('id', taskId)
  if (error) throw error
}

async function createTaskConversation(ids, taskId, requesterId, helperId) {
  const id = randomUUID()
  const { error } = await admin.from('conversations').insert({
    id,
    created_by: requesterId,
    conversation_type: 'task',
    task_id: taskId,
  })
  if (error) throw error

  const { error: participantError } = await admin.from('conversation_participants').insert([
    { conversation_id: id, user_id: requesterId },
    { conversation_id: id, user_id: helperId },
  ])
  if (participantError) throw participantError

  ids.conversationIds.push(id)
  return id
}

async function createDirectConversation(ids, requesterId, createdAt) {
  const id = randomUUID()
  const { error } = await admin.from('conversations').insert({
    id,
    created_by: requesterId,
    conversation_type: 'direct',
    created_at: createdAt,
  })
  if (error) throw error
  ids.conversationIds.push(id)
  return id
}

async function createMessageAndAttachment(ids, conversationId, senderId, sizeBytes = 40) {
  const messageId = randomUUID()
  const attachmentId = randomUUID()
  const { error: messageError } = await admin.from('messages').insert({
    id: messageId,
    conversation_id: conversationId,
    sender_id: senderId,
    body: 'Retention fixture message.',
  })
  if (messageError) throw messageError

  const { error: attachmentError } = await admin.from('attachments').insert({
    id: attachmentId,
    message_id: messageId,
    storage_path: `retention-fixtures/${conversationId}/${messageId}/fixture.txt`,
    file_name: 'fixture.txt',
    mime_type: 'text/plain',
    size_bytes: sizeBytes,
  })
  if (attachmentError) throw attachmentError
  ids.messageIds.push(messageId)
  return { messageId, attachmentId, sizeBytes }
}

async function createPayment(ids, taskId, requesterId, helperId) {
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
    status: 'held',
    correlation_id: correlationId,
    idempotency_key: `chat-retention-payment-${id}`,
    reconciliation_status: 'pending',
    held_at: new Date().toISOString(),
    metadata: { source: 'verify-chat-retention' },
  })
  if (error) throw error
  ids.paymentIds.push(id)
  return id
}

async function createDispute(ids, paymentId, requesterId, helperId, status) {
  const id = randomUUID()
  const { error } = await admin.from('disputes').insert({
    id,
    payment_id: paymentId,
    requester_profile_id: requesterId,
    helper_profile_id: helperId,
    amount_cents: 1234,
    currency: 'eur',
    status,
    metadata: { source: 'verify-chat-retention' },
  })
  if (error) throw error
  ids.disputeIds.push(id)
}

async function createManualHold(ids, conversationId, values = {}) {
  const id = randomUUID()
  const { error } = await admin.from('conversation_retention_holds').insert({
    id,
    conversation_id: conversationId,
    hold_type: 'support_review',
    source_reference: `verify-${id}`,
    starts_at: isoDaysBefore(2),
    ...values,
  })
  if (error) throw error
  ids.holdIds.push(id)
  return id
}

async function preview() {
  const { data, error } = await admin.rpc('preview_task_chat_retention', {
    p_as_of: AS_OF.toISOString(),
    p_limit: 1000,
  })
  if (error) throw error
  return data || []
}

async function retentionState(conversationId) {
  const { data, error } = await admin
    .from('conversations')
    .select('id, retention_started_at, attachments_purge_after, messages_purge_after')
    .eq('id', conversationId)
    .maybeSingle()
  if (error) throw error
  return data
}

async function reportBackfillState() {
  const { data: conversations, error: conversationError } = await admin
    .from('conversations')
    .select('id, task_id, conversation_type, retention_started_at, attachments_purge_after, messages_purge_after')
    .eq('conversation_type', 'task')
  if (conversationError) throw conversationError

  const taskIds = [...new Set((conversations || []).map((conversation) => conversation.task_id).filter(Boolean))]
  if (!taskIds.length) return { taskConversations: 0, initialized: 0, terminalMissing: 0 }

  const { data: tasks, error: taskError } = await admin.from('tasks').select('id, status').in('id', taskIds)
  if (taskError) throw taskError
  const statusByTaskId = new Map((tasks || []).map((task) => [task.id, task.status]))
  const terminalStatuses = new Set(['completed', 'closed', 'cancelled'])
  const initialized = (conversations || []).filter((conversation) => (
    conversation.retention_started_at && conversation.attachments_purge_after && conversation.messages_purge_after
  )).length
  const terminalMissing = (conversations || []).filter((conversation) => (
    terminalStatuses.has(statusByTaskId.get(conversation.task_id))
    && (!conversation.retention_started_at || !conversation.attachments_purge_after || !conversation.messages_purge_after)
  )).length
  return { taskConversations: conversations?.length || 0, initialized, terminalMissing }
}

async function main() {
  const ids = {
    userIds: [],
    taskIds: [],
    conversationIds: [],
    messageIds: [],
    paymentIds: [],
    disputeIds: [],
    holdIds: [],
  }

  try {
    const backfill = await reportBackfillState()
    console.log(`Backfill actual: task chats=${backfill.taskConversations} · inicializados=${backfill.initialized} · terminales sin calendario=${backfill.terminalMissing}`)

    const requester = await createUser('requester')
    const helper = await createUser('helper')
    ids.userIds.push(requester.id, helper.id)
    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper', true)

    const requesterClient = await createUserClient(requester)

    const inProgressTask = await createTask(ids, requester.id, helper.id, 'in_progress', 'Retention in progress')
    const inProgressConversation = await createTaskConversation(ids, inProgressTask, requester.id, helper.id)
    const inProgressState = await retentionState(inProgressConversation)
    const initialPreview = await preview()
    record(
      'T1',
      'in_progress no recibe calendario ni aparece en el preview',
      !inProgressState?.retention_started_at
        && !inProgressState?.attachments_purge_after
        && !inProgressState?.messages_purge_after
        && !rowFor(initialPreview, inProgressConversation),
      `preview=${Boolean(rowFor(initialPreview, inProgressConversation))}`,
    )

    const recentCompletedAt = isoDaysBefore(10)
    const recentTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention completed recent', { completed_at: recentCompletedAt })
    const recentConversation = await createTaskConversation(ids, recentTask, requester.id, helper.id)
    const recentPreview = rowFor(await preview(), recentConversation)
    record(
      'T2',
      'completed reciente conserva el calendario sin ser candidato',
      hasExpectedSchedule(recentPreview, recentCompletedAt) && !recentPreview.attachments_due && !recentPreview.messages_due,
      `attachments_due=${recentPreview?.attachments_due} messages_due=${recentPreview?.messages_due}`,
    )

    const attachmentOnlyCompletedAt = isoDaysBefore(181)
    const attachmentOnlyTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention attachment due', { completed_at: attachmentOnlyCompletedAt })
    const attachmentOnlyConversation = await createTaskConversation(ids, attachmentOnlyTask, requester.id, helper.id)
    await createMessageAndAttachment(ids, attachmentOnlyConversation, requester.id, 40)
    const attachmentOnlyPreview = rowFor(await preview(), attachmentOnlyConversation)
    record(
      'T3',
      'completed con 181 dias marca solo adjuntos',
      hasExpectedSchedule(attachmentOnlyPreview, attachmentOnlyCompletedAt)
        && attachmentOnlyPreview.attachments_due
        && !attachmentOnlyPreview.messages_due
        && attachmentOnlyPreview.attachment_count === 1
        && attachmentOnlyPreview.attachment_bytes === 40,
      `attachments_due=${attachmentOnlyPreview?.attachments_due} messages_due=${attachmentOnlyPreview?.messages_due}`,
    )

    const bothDueCompletedAt = isoDaysBefore(366)
    const bothDueTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention both due', { completed_at: bothDueCompletedAt })
    const bothDueConversation = await createTaskConversation(ids, bothDueTask, requester.id, helper.id)
    await createMessageAndAttachment(ids, bothDueConversation, requester.id, 80)
    const bothDuePreview = rowFor(await preview(), bothDueConversation)
    record(
      'T4',
      'completed con 366 dias marca adjuntos y mensajes',
      hasExpectedSchedule(bothDuePreview, bothDueCompletedAt)
        && bothDuePreview.attachments_due
        && bothDuePreview.messages_due,
      `attachments_due=${bothDuePreview?.attachments_due} messages_due=${bothDuePreview?.messages_due}`,
    )

    const preservedCompletedAt = isoDaysBefore(181)
    const closeTransitionTask = await createTask(ids, requester.id, helper.id, 'in_progress', 'Retention completed closed')
    const closeTransitionConversation = await createTaskConversation(ids, closeTransitionTask, requester.id, helper.id)
    await updateTask(closeTransitionTask, { status: 'completed', completed_at: preservedCompletedAt })
    const afterCompleted = await retentionState(closeTransitionConversation)
    await updateTask(closeTransitionTask, { status: 'closed', updated_at: isoDaysBefore(1) })
    const afterClosed = await retentionState(closeTransitionConversation)
    record(
      'T5',
      'completed a closed conserva el inicio original',
      hasExpectedSchedule(afterCompleted, preservedCompletedAt)
        && afterClosed?.retention_started_at === afterCompleted?.retention_started_at
        && afterClosed?.attachments_purge_after === afterCompleted?.attachments_purge_after
        && afterClosed?.messages_purge_after === afterCompleted?.messages_purge_after,
      `started=${afterClosed?.retention_started_at}`,
    )

    const cancelledAt = isoDaysBefore(181)
    const cancelledTask = await createTask(ids, requester.id, helper.id, 'cancelled', 'Retention cancelled', { cancelled_at: cancelledAt })
    const cancelledConversation = await createTaskConversation(ids, cancelledTask, requester.id, helper.id)
    const cancelledPreview = rowFor(await preview(), cancelledConversation)
    record(
      'T6',
      'cancelled usa cancelled_at como inicio',
      hasExpectedSchedule(cancelledPreview, cancelledAt) && cancelledPreview.attachments_due && !cancelledPreview.messages_due,
      `started=${cancelledPreview?.retention_started_at}`,
    )

    const afterCloseCompletedAt = isoDaysBefore(366)
    const terminalBeforeConversationTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention conversation after close', {
      completed_at: afterCloseCompletedAt,
    })
    const terminalAfterConversation = await createTaskConversation(ids, terminalBeforeConversationTask, requester.id, helper.id)
    const terminalAfterState = await retentionState(terminalAfterConversation)
    record(
      'T7',
      'una conversación creada tras el cierre se inicializa',
      hasExpectedSchedule(terminalAfterState, afterCloseCompletedAt),
      `started=${terminalAfterState?.retention_started_at}`,
    )

    const activeDisputeStatuses = ['opened', 'needs_response', 'under_review']
    const activeDisputeRows = []
    for (const status of activeDisputeStatuses) {
      const taskId = await createTask(ids, requester.id, helper.id, 'completed', `Retention active dispute ${status}`, { completed_at: bothDueCompletedAt })
      const conversationId = await createTaskConversation(ids, taskId, requester.id, helper.id)
      const paymentId = await createPayment(ids, taskId, requester.id, helper.id)
      await createDispute(ids, paymentId, requester.id, helper.id, status)
      activeDisputeRows.push(conversationId)
    }
    const activeDisputePreview = await preview()
    const activeDisputesBlocked = activeDisputeRows.every((conversationId) => {
      const row = rowFor(activeDisputePreview, conversationId)
      return row?.has_active_dispute && !row.attachments_due && !row.messages_due
    })
    record(
      'T8',
      'opened, needs_response y under_review bloquean ambos candidatos',
      activeDisputesBlocked,
      `rows=${activeDisputeRows.length}`,
    )

    const resolvedDisputeStatuses = ['won', 'lost', 'closed']
    const resolvedDisputeRows = []
    for (const status of resolvedDisputeStatuses) {
      const taskId = await createTask(ids, requester.id, helper.id, 'completed', `Retention resolved dispute ${status}`, { completed_at: bothDueCompletedAt })
      const conversationId = await createTaskConversation(ids, taskId, requester.id, helper.id)
      const paymentId = await createPayment(ids, taskId, requester.id, helper.id)
      await createDispute(ids, paymentId, requester.id, helper.id, status)
      resolvedDisputeRows.push(conversationId)
    }
    const resolvedDisputePreview = await preview()
    const resolvedDisputesEligible = resolvedDisputeRows.every((conversationId) => {
      const row = rowFor(resolvedDisputePreview, conversationId)
      return row && !row.has_active_dispute && row.attachments_due && row.messages_due
    })
    record(
      'T9',
      'won, lost y closed no crean una retención automática',
      resolvedDisputesEligible,
      `rows=${resolvedDisputeRows.length}`,
    )

    const activeHoldTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention active manual hold', { completed_at: bothDueCompletedAt })
    const activeHoldConversation = await createTaskConversation(ids, activeHoldTask, requester.id, helper.id)
    await createManualHold(ids, activeHoldConversation)
    const activeHoldPreview = rowFor(await preview(), activeHoldConversation)
    record(
      'T10',
      'un hold manual activo bloquea ambos candidatos',
      activeHoldPreview?.has_active_manual_hold && !activeHoldPreview.attachments_due && !activeHoldPreview.messages_due,
      `manual_hold=${activeHoldPreview?.has_active_manual_hold}`,
    )

    const releasedHoldTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention released hold', { completed_at: bothDueCompletedAt })
    const releasedHoldConversation = await createTaskConversation(ids, releasedHoldTask, requester.id, helper.id)
    await createManualHold(ids, releasedHoldConversation, { released_at: isoDaysBefore(1) })
    const expiredHoldTask = await createTask(ids, requester.id, helper.id, 'completed', 'Retention expired hold', { completed_at: bothDueCompletedAt })
    const expiredHoldConversation = await createTaskConversation(ids, expiredHoldTask, requester.id, helper.id)
    await createManualHold(ids, expiredHoldConversation, { expires_at: isoDaysBefore(1) })
    const releasedHoldPreview = rowFor(await preview(), releasedHoldConversation)
    const expiredHoldPreview = rowFor(await preview(), expiredHoldConversation)
    record(
      'T11',
      'holds liberados o vencidos vuelven a permitir el candidato',
      !releasedHoldPreview?.has_active_manual_hold
        && releasedHoldPreview?.attachments_due
        && releasedHoldPreview?.messages_due
        && !expiredHoldPreview?.has_active_manual_hold
        && expiredHoldPreview?.attachments_due
        && expiredHoldPreview?.messages_due,
      `released=${releasedHoldPreview?.has_active_manual_hold} expired=${expiredHoldPreview?.has_active_manual_hold}`,
    )

    const directConversation = await createDirectConversation(ids, requester.id, isoDaysBefore(500))
    const directState = await retentionState(directConversation)
    const directPreview = rowFor(await preview(), directConversation)
    record(
      'T12',
      'las conversaciones directas antiguas quedan excluidas',
      !directState?.retention_started_at
        && !directState?.attachments_purge_after
        && !directState?.messages_purge_after
        && !directPreview,
      `preview=${Boolean(directPreview)}`,
    )

    const { data: authenticatedPreview, error: authenticatedPreviewError } = await requesterClient.rpc('preview_task_chat_retention', {
      p_as_of: AS_OF.toISOString(),
      p_limit: 10,
    })
    const { data: anonPreview, error: anonPreviewError } = await anon.rpc('preview_task_chat_retention', {
      p_as_of: AS_OF.toISOString(),
      p_limit: 10,
    })
    const { data: authenticatedHolds, error: authenticatedHoldsError } = await requesterClient
      .from('conversation_retention_holds')
      .select('id')
    const { data: authenticatedHoldWrite, error: authenticatedHoldWriteError } = await requesterClient
      .from('conversation_retention_holds')
      .insert({ conversation_id: recentConversation, hold_type: 'support_review' })
      .select('id')
    record(
      'T13',
      'anon y authenticated no ejecutan preview ni leen o escriben holds',
      isBlocked(authenticatedPreviewError, authenticatedPreview)
        && isBlocked(anonPreviewError, anonPreview)
        && isBlocked(authenticatedHoldsError, authenticatedHolds)
        && isBlocked(authenticatedHoldWriteError, authenticatedHoldWrite),
      `auth_preview=${authenticatedPreviewError?.code || 'ok'} anon_preview=${anonPreviewError?.code || 'ok'} holds=${authenticatedHoldsError?.code || 'ok'} write=${authenticatedHoldWriteError?.code || 'ok'}`,
    )

    const metadataPreview = rowFor(await preview(), bothDueConversation)
    const forbiddenFields = ['body', 'content', 'storage_path']
    const previewKeys = Object.keys(metadataPreview || {})
    record(
      'T14',
      'el preview devuelve metadatos sin contenido ni rutas de Storage',
      Boolean(metadataPreview) && forbiddenFields.every((field) => !previewKeys.includes(field)),
      `columns=${previewKeys.join(',')}`,
    )

    const beforePreviewState = await retentionState(bothDueConversation)
    const { count: beforeMessageCount, error: beforeMessageCountError } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', bothDueConversation)
    const { count: beforeAttachmentCount, error: beforeAttachmentCountError } = await admin
      .from('attachments')
      .select('id, messages!inner(conversation_id)', { count: 'exact', head: true })
      .eq('messages.conversation_id', bothDueConversation)
    if (beforeMessageCountError || beforeAttachmentCountError) throw beforeMessageCountError || beforeAttachmentCountError
    await preview()
    const afterPreviewState = await retentionState(bothDueConversation)
    const { count: afterMessageCount, error: afterMessageCountError } = await admin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', bothDueConversation)
    const { count: afterAttachmentCount, error: afterAttachmentCountError } = await admin
      .from('attachments')
      .select('id, messages!inner(conversation_id)', { count: 'exact', head: true })
      .eq('messages.conversation_id', bothDueConversation)
    if (afterMessageCountError || afterAttachmentCountError) throw afterMessageCountError || afterAttachmentCountError
    record(
      'T15',
      'el preview no altera contadores ni timestamps',
      JSON.stringify(beforePreviewState) === JSON.stringify(afterPreviewState)
        && beforeMessageCount === afterMessageCount
        && beforeAttachmentCount === afterAttachmentCount,
      `messages=${beforeMessageCount}/${afterMessageCount} attachments=${beforeAttachmentCount}/${afterAttachmentCount}`,
    )
  } catch (error) {
    record('SETUP', 'Preparación del verificador', false, error?.message || String(error))
  } finally {
    if (ids.holdIds.length) await admin.from('conversation_retention_holds').delete().in('id', ids.holdIds)
    if (ids.disputeIds.length) await admin.from('disputes').delete().in('id', ids.disputeIds)
    if (ids.paymentIds.length) await admin.from('payments').delete().in('id', ids.paymentIds)
    if (ids.conversationIds.length) {
      await admin.from('messages').delete().in('conversation_id', ids.conversationIds)
      await admin.from('conversation_participants').delete().in('conversation_id', ids.conversationIds)
      await admin.from('conversations').delete().in('id', ids.conversationIds)
    }
    if (ids.taskIds.length) await admin.from('tasks').delete().in('id', ids.taskIds)
    if (ids.userIds.length) {
      await admin.from('profiles').delete().in('id', ids.userIds)
      for (const userId of ids.userIds) await admin.auth.admin.deleteUser(userId)
    }
  }

  const failed = results.filter((result) => !result.pass)
  console.log('\n--- RESUMEN ---')
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)
  if (failed.length) {
    console.log('Fallaron:', failed.map((result) => result.id).join(', '))
    process.exitCode = 1
  } else {
    console.log('Chat retention: el modelo de conservación y el dry-run se comportan como se espera.')
  }
}

main()
