import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../contexts/useAuth'

export function useTypingIndicator(conversationId) {
  const { user } = useAuth()
  const [typingUsers, setTypingUsers] = useState([])
  const channelRef = useRef(null)

  const channelName = useMemo(() => {
    return conversationId ? `conversation:${conversationId}` : null
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !user?.id || !channelName) {
      return undefined
    }

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channelRef.current = channel

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return

        setTypingUsers((current) => {
          const next = new Set(current)
          if (payload.isTyping) {
            next.add(payload.userId)
          } else {
            next.delete(payload.userId)
          }
          return [...next]
        })
      })
      .subscribe()

    channel.track({ userId: user.id, isTyping: false })

    return () => {
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [channelName, conversationId, user?.id])

  async function setTyping(isTyping) {
    if (!conversationId || !user?.id || !channelName) return

    const channel = channelRef.current
    if (!channel) return

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, isTyping },
    })
  }

  return {
    typingUsers,
    isTyping: typingUsers.length > 0,
    setTyping,
  }
}
