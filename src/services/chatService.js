import { getTaskById } from './tasksService'
import { requireUser } from '../lib/authHelpers'
import { sanitizeText } from '../lib/security'
import {
  createOrGetDirectConversation,
  editMessage as editConversationMessage,
  getConversationById,
  getMessages as getConversationMessages,
  getMyConversations,
  markConversationAsRead,
  normalizeMessageRow,
  sendMessage as sendConversationMessage,
  softDeleteMessage as softDeleteConversationMessage,
  subscribeToConversationMessages,
} from '../features/chat/api/chatApi'

function mapLegacyMessage(message) {
  if (!message) return null

  return {
    ...message,
    content: message.body,
    updated_at: message.edited_at || message.deleted_at || message.created_at,
  }
}

function mapLegacyConversation(conversation, task = null) {
  if (!conversation) return null

  const participants = conversation.participants || []
  const user1 = participants[0]?.user_id || task?.created_by || null
  const user2 =
    participants.find((participant) => participant.user_id !== user1)?.user_id ||
    task?.accepted_by ||
    null

  return {
    ...conversation,
    task_id: task?.id || null,
    task,
    user1_id: user1,
    user2_id: user2,
  }
}

async function resolveTaskConversation(taskId) {
  const user = await requireUser('Necesitas iniciar sesion para abrir el chat.')
  const task = await getTaskById(taskId, { viewer: user })

  if (!task) {
    throw new Error('La tarea no esta disponible.')
  }

  const otherUserId = task.created_by === user.id ? task.accepted_by : task.created_by

  if (!otherUserId) {
    throw new Error('Todavia no hay otro usuario para abrir este chat.')
  }

  const conversationId = await createOrGetDirectConversation(otherUserId)
  const conversation = await getConversationById(conversationId)

  return {
    task,
    conversation: mapLegacyConversation(conversation, task) || {
      id: conversationId,
      task_id: task.id,
      task,
      participants: [],
      user1_id: task.created_by,
      user2_id: otherUserId,
    },
  }
}

export async function getChatByTaskId(taskId) {
  const { conversation, task } = await resolveTaskConversation(taskId)
  return mapLegacyConversation(conversation, task)
}

export async function getOrCreateChatByTaskId(taskId) {
  const { conversation, task } = await resolveTaskConversation(taskId)
  return mapLegacyConversation(conversation, task)
}

export async function getMessages(chatId) {
  const messages = await getConversationMessages(chatId)
  return messages.map(mapLegacyMessage)
}

export async function sendMessage(chatId, content, clientTempId = null) {
  const clean = sanitizeText(content, 2000)

  if (!clean.length) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const sentMessage = await sendConversationMessage(chatId, clean, clientTempId)
  return mapLegacyMessage(sentMessage)
}

export async function updateMessage(messageId, content) {
  const clean = sanitizeText(content, 2000)

  if (!clean.length) {
    throw new Error('El mensaje no puede estar vacio.')
  }

  const updatedMessage = await editConversationMessage(messageId, clean)
  return mapLegacyMessage(updatedMessage)
}

export async function deleteMessage(messageId) {
  const deletedMessage = await softDeleteConversationMessage(messageId)
  return mapLegacyMessage(deletedMessage)
}

export function subscribeToMessages(chatId, handlers = {}) {
  const callbacks = typeof handlers === 'function' ? { onInsert: handlers } : handlers

  return subscribeToConversationMessages(chatId, {
    onInsert: (message) => callbacks.onInsert?.(mapLegacyMessage(message)),
    onUpdate: (message, previousMessage) => callbacks.onUpdate?.(mapLegacyMessage(message), mapLegacyMessage(previousMessage)),
    onDelete: (message) => callbacks.onDelete?.(mapLegacyMessage(message)),
  })
}

export async function getMyChats() {
  const conversations = await getMyConversations()
  return conversations.map((conversation) => mapLegacyConversation(conversation))
}

export {
  createOrGetDirectConversation,
  getConversationById,
  getConversationById as getDirectConversationById,
  getConversationMessages,
  getMyConversations,
  markConversationAsRead,
  normalizeMessageRow,
}
