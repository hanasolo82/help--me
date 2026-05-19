import { useCallback, useState } from 'react'
import { editMessage, sendMessage, softDeleteMessage } from '../api/chatApi'
import { useRealtimeMessages } from './useRealtimeMessages'
import { createOptimisticMessage, markOptimisticMessageFailed } from '../utils/optimisticMessages'

function getMessageContent(message) {
  return message?.body || message?.content || ''
}

export function useConversationComposer(conversationId, {
  currentUserId,
  appendMessage,
  updateMessage,
  removeMessage,
} = {}) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const safeAppendMessage = useCallback(
    (message) => {
      appendMessage?.(message)
    },
    [appendMessage],
  )

  const safeUpdateMessage = useCallback(
    (message) => {
      updateMessage?.(message)
    },
    [updateMessage],
  )

  const safeRemoveMessage = useCallback(
    (message) => {
      removeMessage?.(message)
    },
    [removeMessage],
  )

  useRealtimeMessages(conversationId, {
    onInsert: (message) => {
      if (!message) return
      safeAppendMessage(message)
    },
    onUpdate: (nextMessage) => {
      if (!nextMessage) return
      safeUpdateMessage(nextMessage)
      if (nextMessage.deleted_at) {
        safeUpdateMessage(nextMessage)
      }
    },
    onDelete: (deletedMessage) => {
      if (!deletedMessage) return
      safeRemoveMessage(deletedMessage)
    },
  })

  const sendDraft = useCallback(
    async (draft) => {
      const cleanDraft = String(draft || '').trim()

      if (!cleanDraft || sending || !conversationId || !currentUserId) {
        return null
      }

      const tempMessage = createOptimisticMessage({
        conversationId,
        senderId: currentUserId,
        body: cleanDraft,
      })

      setError('')
      setSending(true)
      safeAppendMessage(tempMessage)

      try {
        const persisted = await sendMessage(conversationId, cleanDraft, tempMessage.client_temp_id)
        const settledMessage = {
          ...persisted,
          client_temp_id: tempMessage.client_temp_id,
        }
        safeUpdateMessage(settledMessage)
        return settledMessage
      } catch (nextError) {
        const message = nextError?.message || 'No se pudo enviar el mensaje.'
        safeUpdateMessage(markOptimisticMessageFailed(tempMessage, message))
        setError(message)
        throw nextError
      } finally {
        setSending(false)
      }
    },
    [conversationId, currentUserId, safeAppendMessage, safeUpdateMessage, sending],
  )

  const retryMessage = useCallback(
    async (message) => {
      if (!message?.client_temp_id || sending || !conversationId || !currentUserId) {
        return null
      }

      setError('')
      setSending(true)

      try {
        const persisted = await sendMessage(conversationId, getMessageContent(message), message.client_temp_id)
        const settledMessage = {
          ...persisted,
          client_temp_id: message.client_temp_id,
        }
        safeUpdateMessage(settledMessage)
        return settledMessage
      } catch (nextError) {
        const messageText = nextError?.message || 'No se pudo enviar el mensaje.'
        safeUpdateMessage(markOptimisticMessageFailed(message, messageText))
        setError(messageText)
        throw nextError
      } finally {
        setSending(false)
      }
    },
    [conversationId, currentUserId, safeUpdateMessage, sending],
  )

  const editMessageById = useCallback(
    async (messageId, nextContent) => {
      const persisted = await editMessage(messageId, nextContent)
      safeUpdateMessage(persisted)
      return persisted
    },
    [safeUpdateMessage],
  )

  const deleteMessageById = useCallback(
    async (messageId) => {
      const persisted = await softDeleteMessage(messageId)
      safeUpdateMessage(persisted)
      return persisted
    },
    [safeUpdateMessage],
  )

  return {
    sending,
    error,
    setError,
    sendDraft,
    retryMessage,
    editMessageById,
    deleteMessageById,
  }
}
