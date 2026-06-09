import { supabase } from '../../../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../../../lib/security'
import { requireUser } from '../../../lib/authHelpers'

const CONVERSATION_SELECT = 'id, created_by, created_at, updated_at, last_message_at, conversation_type, task_id'
const PARTICIPANT_SELECT = 'id, conversation_id, user_id, created_at, last_read_at'
const PROFILE_SELECT = 'id, username, full_name, avatar_url, rating, account_status'
const MESSAGE_SELECT = '*'

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function sortNewestFirst(left, right) {
  return new Date(right.last_message_at || right.created_at || 0).getTime() - new Date(left.last_message_at || left.created_at || 0).getTime()
}

function normalizeMessageRow(message) {
  if (!message) return null

  const body = message.body ?? message.content ?? ''

  return {
    ...message,
    conversation_id: message.conversation_id ?? message.chat_id ?? null,
    body,
    content: body,
    updated_at: message.edited_at || message.created_at,
  }
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase()
  return message.includes(columnName.toLowerCase()) || message.includes('42703')
}

function isMissingRpcError(error) {
  const status = error?.status ?? error?.code
  const message = String(error?.message || '').toLowerCase()

  return status === 404 || message.includes('function public.') || message.includes('could not find the function')
}

async function fetchLatestMessageForConversation(conversationId) {
  const fetchByColumn = async (columnName) =>
    supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq(columnName, conversationId)
      .order('created_at', { ascending: false })
      .limit(1)

  let response = await fetchByColumn('conversation_id')

  if (response.error && isMissingColumnError(response.error, 'conversation_id')) {
    response = await fetchByColumn('chat_id')
  }

  if (response.error) {
    throw response.error
  }

  return normalizeMessageRow(response.data?.[0] || null)
}

function normalizeConversationRow(conversation, participants, profilesById, latestMessage = null, currentUserId = null) {
  const enrichedParticipants = (participants || []).map((participant) => ({
    ...participant,
    profile: profilesById.get(participant.user_id) || null,
  }))

  const otherParticipant = currentUserId
    ? enrichedParticipants.find((participant) => participant.user_id !== currentUserId) || null
    : enrichedParticipants[0] || null

  return {
    ...conversation,
    participants: enrichedParticipants,
    other_participant: otherParticipant,
    other_user: otherParticipant?.profile || null,
    latest_message: normalizeMessageRow(latestMessage),
  }
}

function normalizePublicProfile(profile) {
  if (!profile) return null

  return {
    ...profile,
    display_name: profile.full_name,
    verified: false,
  }
}

export async function createOrGetDirectConversation(otherUserId) {
  assertSupabaseReady()

  await requireUser('Necesitas iniciar sesion para abrir un chat privado.')

  const rpcResult = await supabase.rpc('create_or_get_direct_conversation', {
    other_user_id: otherUserId,
  })

  if (!rpcResult.error) {
    return rpcResult.data
  }

  if (!isMissingRpcError(rpcResult.error)) {
    throw rpcResult.error
  }

  throw new Error('No se pudo abrir el chat porque falta la función create_or_get_direct_conversation en Supabase. Aplica las migraciones de chat antes de contactar helpers.')
}

export async function createOrGetTaskConversation(taskId) {
  assertSupabaseReady()

  await requireUser('Necesitas iniciar sesion para abrir el chat de la tarea.')

  const rpcResult = await supabase.rpc('create_or_get_task_conversation', {
    p_task_id: taskId,
  })

  if (!rpcResult.error) {
    return rpcResult.data
  }

  if (!isMissingRpcError(rpcResult.error)) {
    throw rpcResult.error
  }

  throw new Error('No se pudo abrir el chat porque falta la función create_or_get_task_conversation en Supabase. Aplica las migraciones de pagos/chat antes de continuar.')
}

async function sendMessageWithRpc(conversationId, body, clientTempId = null) {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_body: body,
    p_client_temp_id: clientTempId,
  })

  if (error) {
    if (isMissingRpcError(error) || String(error?.message || '').toLowerCase().includes('send_message')) {
      return null
    }

    throw error
  }

  return normalizeMessageRow(data)
}

async function sendMessageWithDirectInsert(conversationId, body, clientTempId = null) {
  const user = await requireUser('Necesitas iniciar sesion para enviar mensajes.')

  const { data: insertedMessage, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body,
      message_type: 'text',
      client_temp_id: clientTempId,
    })
    .select(MESSAGE_SELECT)
    .single()

  if (insertError) {
    throw insertError
  }

  const { error: metadataError } = await supabase
    .from('conversations')
    .update({
      last_message_at: insertedMessage.created_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (metadataError) {
    // No bloqueamos el envío si falla el refresco de metadata.
    console.warn('[chatApi.sendMessage] could not update conversation metadata', metadataError)
  }

  return normalizeMessageRow(insertedMessage)
}

export async function getConversationById(conversationId) {
  assertSupabaseReady()
  const user = await requireUser('Necesitas iniciar sesion para leer esta conversacion.')

  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle()

  if (conversationError) {
    throw conversationError
  }

  if (!conversation) {
    return null
  }

  const { data: participants, error: participantsError } = await supabase
    .from('conversation_participants')
    .select(PARTICIPANT_SELECT)
    .eq('conversation_id', conversationId)

  if (participantsError) {
    throw participantsError
  }

  const userIds = [...new Set((participants || []).map((participant) => participant.user_id).filter(Boolean))]

  let profilesById = new Map()
  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select(PROFILE_SELECT)
      .in('id', userIds)

    if (profilesError) {
      throw profilesError
    }

    profilesById = new Map((profiles || []).map((profile) => [profile.id, normalizePublicProfile(profile)]))
  }

  return normalizeConversationRow(
    conversation,
    participants,
    profilesById,
    await fetchLatestMessageForConversation(conversationId),
    user.id,
  )
}

export async function getMyConversations() {
  assertSupabaseReady()
  const user = await requireUser('Necesitas iniciar sesion para ver tus conversaciones.')

  const { data: participantRows, error: participantError } = await supabase
    .from('conversation_participants')
    .select(PARTICIPANT_SELECT)
    .eq('user_id', user.id)

  if (participantError) {
    throw participantError
  }

  const participantConversationIds = (participantRows || []).map((row) => row.conversation_id).filter(Boolean)

  const { data: createdConversations, error: createdConversationsError } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('created_by', user.id)

  if (createdConversationsError && !String(createdConversationsError.message || '').toLowerCase().includes('permission')) {
    throw createdConversationsError
  }

  const createdConversationIds = (createdConversations || []).map((conversation) => conversation.id).filter(Boolean)
  const conversationIds = [...new Set([...participantConversationIds, ...createdConversationIds])]

  if (conversationIds.length === 0) {
    return []
  }

  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .in('id', conversationIds)

  if (conversationsError) {
    throw conversationsError
  }

  const { data: fetchedParticipants, error: allParticipantsError } = await supabase
    .from('conversation_participants')
    .select(PARTICIPANT_SELECT)
    .in('conversation_id', conversationIds)

  if (allParticipantsError && !String(allParticipantsError.message || '').toLowerCase().includes('permission')) {
    throw allParticipantsError
  }

  const allParticipants = allParticipantsError ? participantRows || [] : fetchedParticipants || []
  const participantUserIds = [...new Set((allParticipants || []).map((row) => row.user_id).filter(Boolean))]
  let profilesById = new Map()

  if (participantUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('public_profiles')
      .select(PROFILE_SELECT)
      .in('id', participantUserIds)

    if (profilesError) {
      throw profilesError
    }

    profilesById = new Map((profiles || []).map((profile) => [profile.id, normalizePublicProfile(profile)]))
  }

  const latestMessageByConversation = new Map()
  await Promise.all(
    conversationIds.map(async (conversationId) => {
      try {
        const latestMessage = await fetchLatestMessageForConversation(conversationId)

        if (latestMessage) {
          latestMessageByConversation.set(conversationId, latestMessage)
        }
      } catch (error) {
        console.warn('[chatApi.getMyConversations] latest message unavailable', {
          conversationId,
          error,
        })
      }
    }),
  )

  const participantsByConversation = new Map()
  for (const participant of allParticipants || []) {
    const collection = participantsByConversation.get(participant.conversation_id) || []
    collection.push(participant)
    participantsByConversation.set(participant.conversation_id, collection)
  }

  return [...(conversations || [])]
    .map((conversation) =>
      normalizeConversationRow(
        conversation,
        participantsByConversation.get(conversation.id) || [],
        profilesById,
        latestMessageByConversation.get(conversation.id) || null,
        user.id,
      ),
    )
    .sort(sortNewestFirst)
}

export async function getMessages(conversationId, { cursor = null, limit = 30 } = {}) {
  assertSupabaseReady()
  await requireUser('Necesitas iniciar sesion para leer mensajes.')

  const fetchByColumn = async (columnName) => {
    let query = supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq(columnName, conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    return query
  }

  let response = await fetchByColumn('conversation_id')

  if (response.error && isMissingColumnError(response.error, 'conversation_id')) {
    response = await fetchByColumn('chat_id')
  }

  if (response.error) {
    throw response.error
  }

  return [...(response.data || [])].reverse().map(normalizeMessageRow)
}

export async function sendMessage(conversationId, body, clientTempId = null) {
  assertSupabaseReady()

  const cleanBody = sanitizeText(body, 2000)
  if (!cleanBody) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const message = await sendMessageWithRpc(conversationId, cleanBody, clientTempId)
    || await sendMessageWithDirectInsert(conversationId, cleanBody, clientTempId)

  if (!message) {
    throw new Error('No se pudo crear el mensaje.')
  }

  return message
}

export async function editMessage(messageId, body) {
  assertSupabaseReady()
  const cleanBody = sanitizeText(body, 2000)

  if (!cleanBody) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  if (!isUuid(messageId)) {
    throw new Error('No puedes editar un mensaje todavia no confirmado.')
  }

  const { data, error } = await supabase
    .from('messages')
    .update({
      body: cleanBody,
      edited_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo editar el mensaje.')
  }

  return normalizeMessageRow(data)
}

export async function softDeleteMessage(messageId) {
  assertSupabaseReady()

  if (!isUuid(messageId)) {
    throw new Error('No puedes borrar un mensaje todavia no confirmado.')
  }

  const { data, error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select(MESSAGE_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo borrar el mensaje.')
  }

  return normalizeMessageRow(data)
}

export async function markConversationAsRead(conversationId) {
  assertSupabaseReady()

  const { error } = await supabase.rpc('mark_conversation_as_read', {
    p_conversation_id: conversationId,
  })

  if (error) {
    throw error
  }

  return true
}

export function subscribeToConversationMessages(conversationId, callbacks = {}) {
  assertSupabaseReady()

  const channelName = `conversation:${conversationId}:${Date.now()}:${Math.random().toString(36).slice(2)}`
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => callbacks.onInsert?.(normalizeMessageRow(payload.new)),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => callbacks.onUpdate?.(normalizeMessageRow(payload.new), normalizeMessageRow(payload.old)),
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => callbacks.onDelete?.(normalizeMessageRow(payload.old)),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export { MESSAGE_SELECT, PARTICIPANT_SELECT, PROFILE_SELECT, normalizeMessageRow }
