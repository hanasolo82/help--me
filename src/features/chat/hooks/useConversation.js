import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getConversationById, markConversationAsRead } from '../api/chatApi'

export function useConversation(conversationId) {
  const query = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversationById(conversationId),
    enabled: Boolean(conversationId),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!conversationId || !query.data) {
      return undefined
    }

    markConversationAsRead(conversationId).catch(() => {})
  }, [conversationId, query.data])

  return {
    conversation: query.data || null,
    loading: query.isLoading && !query.data,
    error: query.error?.message || '',
  }
}
