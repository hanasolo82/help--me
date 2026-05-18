import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/useAuth'
import { getMyChats } from '../services/chatService'

function sortChats(chats) {
  return [...(chats || [])].sort(
    (left, right) =>
      new Date(right.last_message_at || right.created_at || 0).getTime() -
      new Date(left.last_message_at || left.created_at || 0).getTime(),
  )
}

export function useChats() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: ['chats', user?.id ?? null],
    queryFn: getMyChats,
    enabled: Boolean(user?.id),
    staleTime: 30_000,
    select: sortChats,
  })

  return {
    ...query,
    chats: query.data || [],
    error: query.error?.message || '',
  }
}

