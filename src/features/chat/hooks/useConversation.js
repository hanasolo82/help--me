import { useEffect, useState } from 'react'
import { getConversationById, markConversationAsRead } from '../api/chatApi'

export function useConversation(conversationId) {
  const [conversation, setConversation] = useState(null)
  const [loadedConversationId, setLoadedConversationId] = useState(null)
  const [error, setError] = useState('')
  const loading = Boolean(conversationId) && loadedConversationId !== conversationId

  useEffect(() => {
    let cancelled = false

    if (!conversationId) return undefined

    getConversationById(conversationId)
      .then((data) => {
        if (cancelled) return
        setConversation(data)
        setLoadedConversationId(conversationId)
        setError('')
      })
      .catch((err) => {
        if (cancelled) return
        setConversation(null)
        setLoadedConversationId(conversationId)
        setError(err?.message || 'No se pudo cargar la conversacion.')
      })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !conversation) {
      return undefined
    }

    markConversationAsRead(conversationId).catch(() => {})
  }, [conversation, conversationId])

  return { conversation, loading, error, setConversation }
}
