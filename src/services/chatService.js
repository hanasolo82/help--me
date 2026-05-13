import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

// Devuelve el chat asociado a una tarea (creado al aceptar). Sin embed de profiles
// porque las FKs van a auth.users; los nombres se podran resolver aparte si hace falta.
export async function getChatByTaskId(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('chats')
    .select(`
      id,
      task_id,
      user1_id,
      user2_id,
      created_at,
      task:tasks!chats_task_id_fkey ( id, title, status, created_by, accepted_by )
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
    .select('id, chat_id, sender_id, content, created_at')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(200)

  if (error) {
    throw error
  }

  return data
}

// Envia un mensaje validando longitud. sender_id se rellena con el usuario autenticado.
export async function sendMessage(chatId, content) {
  assertSupabaseReady()

  const clean = sanitizeText(content, 1200)

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
      content: clean,
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

// Lista los chats donde el usuario actual es user1 o user2, con la tarea asociada.
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
      user1_id,
      user2_id,
      created_at,
      task:tasks!chats_task_id_fkey ( id, title, status, created_by, accepted_by )
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}
