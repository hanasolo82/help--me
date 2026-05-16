import { useEffect, useRef } from 'react'
import { subscribeToConversationMessages } from '../api/chatApi'

export function useRealtimeMessages(conversationId, handlers = {}) {
  const handlersRef = useRef(handlers)

  useEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!conversationId) {
      return undefined
    }

    const unsubscribe = subscribeToConversationMessages(conversationId, {
      onInsert: (message) => handlersRef.current.onInsert?.(message),
      onUpdate: (message, previousMessage) => handlersRef.current.onUpdate?.(message, previousMessage),
      onDelete: (message) => handlersRef.current.onDelete?.(message),
    })

    return () => unsubscribe()
  }, [conversationId])
}
