import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

// Devuelve el chat asociado a una tarea (creado al aceptar). Incluye perfiles de ambos participantes.
export async function getChatByTaskId(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('chats')
    .select(`
      id,
      task_id,
      requester_id,
      helper_id,
      created_at,
      requester:profiles!chats_requester_id_fkey ( id, username, full_name, avatar_url ),
      helper:profiles!chats_helper_id_fkey ( id, username, full_name, avatar_url ),
      task:tasks ( id, title, status )
    `)
    .eq('task_id', taskId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Lee los mensajes del chat ordenados cronologicamente.
export async function getMessages(chatId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, body, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    throw error
  }

  return data
}

// Envia un mensaje validando longitud. sender_id se rellena con el usuario autenticado.
export async function sendMessage(chatId, body) {
  assertSupabaseReady()

  const clean = sanitizeText(body, 1200)

  if (clean.length < 1) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion para enviar mensajes.')
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: userData.user.id,
      body: clean,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Suscripcion realtime a inserts de mensajes de un chat. Devuelve funcion para desuscribirse.
export function subscribeToMessages(chatId, onInsert) {
  assertSupabaseReady()

  const channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Lista los chats donde el usuario actual es requester o helper, con ultima actividad.
export async function getMyChats() {
  assertSupabaseReady()

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion.')
  }

  const userId = userData.user.id

  const { data, error } = await supabase
    .from('chats')
    .select(`
      id,
      task_id,
      requester_id,
      helper_id,
      created_at,
      requester:profiles!chats_requester_id_fkey ( id, username, full_name, avatar_url ),
      helper:profiles!chats_helper_id_fkey ( id, username, full_name, avatar_url ),
      task:tasks ( id, title, status )
    `)
    .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}
