import { useCallback, useEffect, useRef, useState } from 'react'
import { getMessages } from '../api/chatApi'

export function useMessages(conversationId, { pageSize = 30 } = {}) {
  const [messages, setMessages] = useState([])
  const [loadedConversationId, setLoadedConversationId] = useState(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const oldestCursorRef = useRef(null)
  const loadingInitial = Boolean(conversationId) && loadedConversationId !== conversationId

  const fetchInitial = useCallback(async () => {
    if (!conversationId) return

    try {
      const data = await getMessages(conversationId, { limit: pageSize })
      setMessages(data || [])
      setHasMore(Boolean(data && data.length === pageSize))
      oldestCursorRef.current = data?.[0]?.created_at || null
      setError('')
    } catch (err) {
      setMessages([])
      setHasMore(false)
      setError(err?.message || 'No se pudieron cargar los mensajes.')
    } finally {
      setLoadedConversationId(conversationId)
    }
  }, [conversationId, pageSize])

  useEffect(() => {
    if (!conversationId) return undefined

    let cancelled = false

    void (async () => {
      try {
        const data = await getMessages(conversationId, { limit: pageSize })
        if (cancelled) return
        setMessages(data || [])
        setHasMore(Boolean(data && data.length === pageSize))
        oldestCursorRef.current = data?.[0]?.created_at || null
        setError('')
      } catch (err) {
        if (cancelled) return
        setMessages([])
        setHasMore(false)
        setError(err?.message || 'No se pudieron cargar los mensajes.')
      } finally {
        if (!cancelled) {
          setLoadedConversationId(conversationId)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [conversationId, pageSize])

  const loadOlder = useCallback(async () => {
    if (!conversationId || loadingMore || !hasMore || !oldestCursorRef.current) {
      return []
    }

    setLoadingMore(true)
    setError('')

    try {
      const older = await getMessages(conversationId, {
        cursor: oldestCursorRef.current,
        limit: pageSize,
      })

      setMessages((current) => [...older, ...current])
      setHasMore(Boolean(older && older.length === pageSize))
      oldestCursorRef.current = older?.[0]?.created_at || oldestCursorRef.current
      return older || []
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar mas mensajes.')
      return []
    } finally {
      setLoadingMore(false)
    }
  }, [conversationId, hasMore, loadingMore, pageSize])

  const appendMessage = useCallback((message) => {
    if (!message) return

    setMessages((current) => {
      if (current.some((item) => item.id === message.id || item.client_temp_id === message.client_temp_id)) {
        return current.map((item) => {
          if (item.id === message.id || (item.client_temp_id && item.client_temp_id === message.client_temp_id)) {
            return message
          }
          return item
        })
      }

      return [...current, message]
    })
  }, [])

  const updateMessage = useCallback((message) => {
    if (!message) return

    setMessages((current) => current.map((item) => (item.id === message.id || item.client_temp_id === message.client_temp_id ? message : item)))
  }, [])

  const removeMessage = useCallback((message) => {
    if (!message) return

    setMessages((current) => current.filter((item) => item.id !== message.id))
  }, [])

  return {
    messages,
    setMessages,
    loadingInitial,
    loadingMore,
    error,
    hasMore,
    loadOlder,
    appendMessage,
    updateMessage,
    removeMessage,
    refetch: fetchInitial,
  }
}
