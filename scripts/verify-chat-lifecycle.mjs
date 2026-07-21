// Verificacion RLS del ciclo de vida de chats de tarea.
//
//   pnpm run verify:chat-lifecycle
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY. Crea datos aislados y los elimina al terminar.

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const ATTACHMENTS_BUCKET = 'chat-attachments'

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const results = []

function record(id, description, pass, detail = '') {
  results.push({ id, description, pass, detail })
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} · ${description}${detail ? ` — ${detail}` : ''}`)
}

function rowCount(data) {
  return Array.isArray(data) ? data.length : data ? 1 : 0
}

function isBlocked(error, data) {
  return Boolean(error) || rowCount(data) === 0
}

function errorDetail(error, data) {
  return error ? `error ${error.code || error.message}` : `filas=${rowCount(data)}`
}

function username(label) {
  return `${label}_${randomUUID().slice(0, 10).replace(/-/g, '')}`.toLowerCase().slice(0, 30)
}

async function createUser(label) {
  const email = `chat-lifecycle-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `Test-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Chat lifecycle ${label}` },
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

async function ensureProfile(user, label, overrides = {}) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      username: username(label),
      full_name: `Chat lifecycle ${label}`,
      neighborhood: 'Test Area',
      account_status: 'active',
      rating: 0,
      completed_tasks: 0,
      reviews_count: 0,
      verified: false,
      helper_status: 'not_started',
      ...overrides,
    },
    { onConflict: 'id' },
  )
  if (error) throw error
}

async function createTask(ids, requesterId, helperId, status, title) {
  const id = randomUUID()
  const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000)
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
  const { error } = await admin.from('tasks').insert({
    id,
    created_by: requesterId,
    accepted_by: helperId,
    title,
    description: 'Temporary task used to verify task-chat lifecycle RLS.',
    category: 'Recados',
    price: 12.34,
    status,
    lat: 40.4168,
    lng: -3.7038,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    timezone: 'Europe/Madrid',
    published_at: new Date().toISOString(),
  })
  if (error) throw error
  ids.taskIds.push(id)
  return id
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

async function sendMessage(client, conversationId, body, clientTempId = randomUUID()) {
  const { data, error } = await client.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
    p_client_temp_id: clientTempId,
  })
  return { message: Array.isArray(data) ? data[0] : data, error }
}

async function createAttachment(client, messageId, storagePath) {
  const { data, error } = await client
    .from('attachments')
    .insert({
      message_id: messageId,
      storage_path: storagePath,
      file_name: 'lifecycle.txt',
      mime_type: 'text/plain',
      size_bytes: 10,
    })
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (!data?.id) throw new Error('Could not create attachment fixture.')
  return data.id
}

async function uploadFixture(client, path) {
  const { error } = await client.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, new Blob(['lifecycle'], { type: 'text/plain' }), { contentType: 'text/plain', upsert: false })
  if (error) throw error
}

function attachmentStoragePath(conversationId, messageId, label) {
  return `${conversationId}/${messageId}/${randomUUID()}/${label}.txt`
}

async function storageObjectExists(path) {
  const parts = path.split('/')
  const fileName = parts.pop()
  const { data, error } = await admin.storage.from(ATTACHMENTS_BUCKET).list(parts.join('/'), { limit: 100 })
  if (error) throw error
  return (data || []).some((item) => item.name === fileName)
}

async function setTaskStatus(taskId, status) {
  const { error } = await admin.from('tasks').update({ status }).eq('id', taskId)
  if (error) throw error
}

async function main() {
  const ids = { userIds: [], taskIds: [], conversationIds: [], storagePaths: [] }

  try {
    const requester = await createUser('requester')
    const helper = await createUser('helper')
    const third = await createUser('third')
    ids.userIds.push(requester.id, helper.id, third.id)

    await ensureProfile(requester, 'requester')
    await ensureProfile(helper, 'helper', { helper_status: 'active' })
    await ensureProfile(third, 'third')
    const { error: preferenceError } = await admin.from('direct_message_preferences').upsert(
      { profile_id: helper.id, accepts_direct_messages: true },
      { onConflict: 'profile_id' },
    )
    if (preferenceError) throw preferenceError

    const lifecycleTask = await createTask(ids, requester.id, helper.id, 'in_progress', 'Chat lifecycle task')
    const assignedTask = await createTask(ids, requester.id, helper.id, 'assigned', 'Assigned chat lifecycle task')
    const lifecycleConversation = await createTaskConversation(ids, lifecycleTask, requester.id, helper.id)
    const assignedConversation = await createTaskConversation(ids, assignedTask, requester.id, helper.id)

    const requesterClient = await createUserClient(requester)
    const helperClient = await createUserClient(helper)
    const thirdClient = await createUserClient(third)

    const { data: assignedAccess, error: assignedAccessError } = await requesterClient.rpc('can_access_conversation', {
      p_conversation_id: assignedConversation,
    })
    const { data: assignedSend, error: assignedSendError } = await requesterClient.rpc('can_send_to_conversation', {
      p_conversation_id: assignedConversation,
    })
    const { error: assignedMessageError } = await sendMessage(requesterClient, assignedConversation, 'No debe enviarse en assigned')
    record(
      'T1',
      'Tarea assigned permanece sin lectura ni escritura',
      !assignedAccessError && assignedAccess === false && !assignedSendError && assignedSend === false && Boolean(assignedMessageError),
      `access=${assignedAccess} send=${assignedSend} message=${assignedMessageError?.code || 'ok'}`,
    )

    const { data: inProgressAccess, error: inProgressAccessError } = await requesterClient.rpc('can_access_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { data: inProgressSend, error: inProgressSendError } = await requesterClient.rpc('can_send_to_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { message: inProgressMessage, error: inProgressMessageError } = await sendMessage(
      requesterClient,
      lifecycleConversation,
      'Mensaje durante in_progress',
    )
    const { message: completedMessage, error: completedMessageError } = await sendMessage(
      requesterClient,
      lifecycleConversation,
      'Mensaje para probar completed',
    )
    const { message: closedMessage, error: closedMessageError } = await sendMessage(
      requesterClient,
      lifecycleConversation,
      'Mensaje para probar closed',
    )
    const { data: editedInProgress, error: editInProgressError } = await requesterClient
      .from('messages')
      .update({ body: 'Mensaje editado durante in_progress', edited_at: new Date().toISOString() })
      .eq('id', inProgressMessage?.id)
      .select('id')
      .maybeSingle()
    const completedAttachmentPath = attachmentStoragePath(lifecycleConversation, completedMessage.id, 'completed')
    const closedAttachmentPath = attachmentStoragePath(lifecycleConversation, closedMessage.id, 'closed')
    ids.storagePaths.push(completedAttachmentPath, closedAttachmentPath)
    const completedAttachmentId = await createAttachment(requesterClient, completedMessage.id, completedAttachmentPath)
    const closedAttachmentId = await createAttachment(requesterClient, closedMessage.id, closedAttachmentPath)
    await uploadFixture(requesterClient, completedAttachmentPath)
    await uploadFixture(requesterClient, closedAttachmentPath)
    record(
      'T2',
      'Tarea in_progress permite leer, enviar, editar y adjuntar',
      !inProgressAccessError
        && inProgressAccess === true
        && !inProgressSendError
        && inProgressSend === true
        && !inProgressMessageError
        && !completedMessageError
        && !closedMessageError
        && !editInProgressError
        && editedInProgress?.id === inProgressMessage?.id,
      `access=${inProgressAccess} send=${inProgressSend} message=${inProgressMessageError?.code || 'ok'} edit=${editInProgressError?.code || 'ok'} attachment=ok`,
    )

    const { data: directConversation, error: directConversationError } = await requesterClient.rpc('create_or_get_direct_conversation', {
      other_user_id: helper.id,
    })
    const directConversationId = Array.isArray(directConversation) ? directConversation[0] : directConversation
    if (directConversationError || !directConversationId) throw directConversationError || new Error('Could not create direct conversation.')
    ids.conversationIds.push(directConversationId)
    const { data: directCanSend, error: directCanSendError } = await requesterClient.rpc('can_send_to_conversation', {
      p_conversation_id: directConversationId,
    })
    const { message: directFirstMessage, error: directFirstMessageError } = await sendMessage(
      requesterClient,
      directConversationId,
      'Mensaje directo inicial',
    )
    const { message: directReply, error: directReplyError } = await sendMessage(
      helperClient,
      directConversationId,
      'Respuesta directa',
    )
    record(
      'T3',
      'La conversación directa conserva su flujo actual',
      !directCanSendError && directCanSend === true && !directFirstMessageError && !directReplyError && Boolean(directFirstMessage?.id) && Boolean(directReply?.id),
      `can_send=${directCanSend} first=${directFirstMessageError?.code || 'ok'} reply=${directReplyError?.code || 'ok'}`,
    )

    const { data: thirdMessages, error: thirdReadError } = await thirdClient
      .from('messages')
      .select('id')
      .eq('conversation_id', lifecycleConversation)
    const { data: thirdCanSend, error: thirdCanSendError } = await thirdClient.rpc('can_send_to_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { error: thirdMessageError } = await sendMessage(thirdClient, lifecycleConversation, 'No soy participante')
    record(
      'T4',
      'Un tercero no lee ni escribe un chat de tarea',
      !thirdReadError && (thirdMessages?.length || 0) === 0 && !thirdCanSendError && thirdCanSend === false && Boolean(thirdMessageError),
      `rows=${thirdMessages?.length || 0} can_send=${thirdCanSend} message=${thirdMessageError?.code || 'ok'}`,
    )

    await setTaskStatus(lifecycleTask, 'completed')
    const { data: completedAccess, error: completedAccessError } = await requesterClient.rpc('can_access_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { data: completedCanSend, error: completedCanSendError } = await requesterClient.rpc('can_send_to_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { data: completedHistory, error: completedHistoryError } = await requesterClient
      .from('messages')
      .select('id')
      .eq('conversation_id', lifecycleConversation)
    const { error: completedSendError } = await sendMessage(requesterClient, lifecycleConversation, 'No debe enviarse tras completed')
    const { data: completedEdit, error: completedEditError } = await requesterClient
      .from('messages')
      .update({ body: 'No debe editarse tras completed', edited_at: new Date().toISOString() })
      .eq('id', completedMessage.id)
      .select('id')
    const { data: completedDelete, error: completedDeleteError } = await requesterClient
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', completedMessage.id)
      .select('id')
    const { error: completedRetryError } = await sendMessage(requesterClient, lifecycleConversation, 'Reintento bloqueado tras completed', randomUUID())
    const { data: completedAttachmentInsert, error: completedAttachmentInsertError } = await requesterClient
      .from('attachments')
      .insert({ message_id: completedMessage.id, storage_path: attachmentStoragePath(lifecycleConversation, completedMessage.id, 'blocked') })
      .select('id')
    const { data: completedAttachmentDelete, error: completedAttachmentDeleteError } = await requesterClient
      .from('attachments')
      .delete()
      .eq('id', completedAttachmentId)
      .select('id')
    const completedStorageUploadPath = attachmentStoragePath(lifecycleConversation, completedMessage.id, 'blocked-upload')
    ids.storagePaths.push(completedStorageUploadPath)
    const { error: completedStorageUploadError } = await requesterClient.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(completedStorageUploadPath, new Blob(['blocked'], { type: 'text/plain' }), { contentType: 'text/plain', upsert: false })
    const { error: completedStorageDeleteError } = await requesterClient.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([completedAttachmentPath])
    const completedStorageDeleteBlocked = Boolean(completedStorageDeleteError)
      || await storageObjectExists(completedAttachmentPath)
    record(
      'T5',
      'Tarea completed conserva lectura y bloquea toda escritura',
      !completedAccessError
        && completedAccess === true
        && !completedCanSendError
        && completedCanSend === false
        && !completedHistoryError
        && (completedHistory?.length || 0) >= 3
        && Boolean(completedSendError)
        && isBlocked(completedEditError, completedEdit)
        && isBlocked(completedDeleteError, completedDelete)
        && Boolean(completedRetryError)
        && isBlocked(completedAttachmentInsertError, completedAttachmentInsert)
        && isBlocked(completedAttachmentDeleteError, completedAttachmentDelete)
        && Boolean(completedStorageUploadError)
        && completedStorageDeleteBlocked,
      `access=${completedAccess} send=${completedCanSend} history=${completedHistory?.length || 0} message=${completedSendError?.code || 'ok'} edit=${errorDetail(completedEditError, completedEdit)} delete=${errorDetail(completedDeleteError, completedDelete)} attachment=${errorDetail(completedAttachmentInsertError, completedAttachmentInsert)} attachmentDelete=${errorDetail(completedAttachmentDeleteError, completedAttachmentDelete)} storageUpload=${completedStorageUploadError?.statusCode || completedStorageUploadError?.message || 'ok'} storageDelete=${completedStorageDeleteError?.statusCode || (completedStorageDeleteBlocked ? 'blocked' : 'removed')}`,
    )

    await setTaskStatus(lifecycleTask, 'closed')
    const { data: closedAccess, error: closedAccessError } = await requesterClient.rpc('can_access_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { data: closedCanSend, error: closedCanSendError } = await requesterClient.rpc('can_send_to_conversation', {
      p_conversation_id: lifecycleConversation,
    })
    const { data: closedHistory, error: closedHistoryError } = await requesterClient
      .from('messages')
      .select('id')
      .eq('conversation_id', lifecycleConversation)
    const { error: closedSendError } = await sendMessage(requesterClient, lifecycleConversation, 'No debe enviarse tras closed')
    const { data: closedEdit, error: closedEditError } = await requesterClient
      .from('messages')
      .update({ body: 'No debe editarse tras closed', edited_at: new Date().toISOString() })
      .eq('id', closedMessage.id)
      .select('id')
    const { data: closedDelete, error: closedDeleteError } = await requesterClient
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', closedMessage.id)
      .select('id')
    const { error: closedRetryError } = await sendMessage(requesterClient, lifecycleConversation, 'Reintento bloqueado tras closed', randomUUID())
    const { data: closedAttachmentInsert, error: closedAttachmentInsertError } = await requesterClient
      .from('attachments')
      .insert({ message_id: closedMessage.id, storage_path: attachmentStoragePath(lifecycleConversation, closedMessage.id, 'blocked') })
      .select('id')
    const { data: closedAttachmentDelete, error: closedAttachmentDeleteError } = await requesterClient
      .from('attachments')
      .delete()
      .eq('id', closedAttachmentId)
      .select('id')
    const closedStorageUploadPath = attachmentStoragePath(lifecycleConversation, closedMessage.id, 'blocked-upload')
    ids.storagePaths.push(closedStorageUploadPath)
    const { error: closedStorageUploadError } = await requesterClient.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(closedStorageUploadPath, new Blob(['blocked'], { type: 'text/plain' }), { contentType: 'text/plain', upsert: false })
    const { error: closedStorageDeleteError } = await requesterClient.storage
      .from(ATTACHMENTS_BUCKET)
      .remove([closedAttachmentPath])
    const closedStorageDeleteBlocked = Boolean(closedStorageDeleteError)
      || await storageObjectExists(closedAttachmentPath)
    record(
      'T6',
      'Tarea closed conserva lectura y bloquea toda escritura',
      !closedAccessError
        && closedAccess === true
        && !closedCanSendError
        && closedCanSend === false
        && !closedHistoryError
        && (closedHistory?.length || 0) >= 3
        && Boolean(closedSendError)
        && isBlocked(closedEditError, closedEdit)
        && isBlocked(closedDeleteError, closedDelete)
        && Boolean(closedRetryError)
        && isBlocked(closedAttachmentInsertError, closedAttachmentInsert)
        && isBlocked(closedAttachmentDeleteError, closedAttachmentDelete)
        && Boolean(closedStorageUploadError)
        && closedStorageDeleteBlocked,
      `access=${closedAccess} send=${closedCanSend} history=${closedHistory?.length || 0} message=${closedSendError?.code || 'ok'} edit=${errorDetail(closedEditError, closedEdit)} delete=${errorDetail(closedDeleteError, closedDelete)} attachment=${errorDetail(closedAttachmentInsertError, closedAttachmentInsert)} attachmentDelete=${errorDetail(closedAttachmentDeleteError, closedAttachmentDelete)} storageUpload=${closedStorageUploadError?.statusCode || closedStorageUploadError?.message || 'ok'} storageDelete=${closedStorageDeleteError?.statusCode || (closedStorageDeleteBlocked ? 'blocked' : 'removed')}`,
    )
  } catch (error) {
    record('SETUP', 'Preparacion del verificador', false, error?.message || String(error))
  } finally {
    if (ids.storagePaths.length) {
      await admin.storage.from(ATTACHMENTS_BUCKET).remove(ids.storagePaths)
    }
    if (ids.conversationIds.length) {
      await admin.from('messages').delete().in('conversation_id', ids.conversationIds)
      await admin.from('conversation_participants').delete().in('conversation_id', ids.conversationIds)
      await admin.from('conversations').delete().in('id', ids.conversationIds)
    }
    if (ids.taskIds.length) {
      await admin.from('tasks').delete().in('id', ids.taskIds)
    }
    if (ids.userIds.length) {
      await admin.from('profiles').delete().in('id', ids.userIds)
      for (const userId of ids.userIds) {
        await admin.auth.admin.deleteUser(userId)
      }
    }
  }

  const failed = results.filter((result) => !result.pass)
  console.log('\n--- RESUMEN ---')
  console.log(`Total: ${results.length} · OK: ${results.length - failed.length} · FAIL: ${failed.length}`)
  if (failed.length) {
    console.log('Fallaron:', failed.map((result) => result.id).join(', '))
    process.exitCode = 1
  } else {
    console.log('Chat lifecycle: los permisos de lectura y escritura se comportan como se espera.')
  }
}

main()
