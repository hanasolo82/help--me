import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { getConversationById, markConversationAsRead } from '../api/chatApi'

export function useConversation(conversationId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
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

    markConversationAsRead(conversationId)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id ?? null] })
      })
      .catch(() => {})
  }, [conversationId, query.data, queryClient, user?.id])

  return {
    conversation: query.data || null,
    loading: query.isLoading && !query.data,
    error: query.error?.message || '',
  }
}
