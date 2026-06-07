import { useCallback, useMemo } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { getMessages } from '../api/chatApi'

function getMessageKey(message) {
  return message?.client_temp_id || message?.id || null
}

function getMessageKeys(message) {
  return [message?.client_temp_id, message?.id].filter(Boolean)
}

function isSameMessage(left, right) {
  if (!left || !right) return false

  const leftKeys = getMessageKeys(left)
  const rightKeys = new Set(getMessageKeys(right))

  return leftKeys.some((key) => rightKeys.has(key))
}

function sortMessagesAscending(messages) {
  return [...messages].sort((left, right) => {
    const leftDate = new Date(left.created_at || 0).getTime()
    const rightDate = new Date(right.created_at || 0).getTime()

    if (leftDate !== rightDate) {
      return leftDate - rightDate
    }

    return String(left.id || left.client_temp_id || '').localeCompare(String(right.id || right.client_temp_id || ''))
  })
}

function flattenPages(pages) {
  const map = new Map()

  for (const page of pages || []) {
    for (const message of page || []) {
      const key = getMessageKey(message)
      if (!key) continue
      map.set(key, message)
    }
  }

  return sortMessagesAscending([...map.values()])
}

function updatePages(pages, updater) {
  return (pages || []).map((page) => updater(page || []))
}

export function useMessages(conversationId, { pageSize = 30 } = {}) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['conversation-messages', conversationId, pageSize], [conversationId, pageSize])

  const query = useInfiniteQuery({
    queryKey,
    enabled: Boolean(conversationId),
    initialPageParam: null,
    queryFn: ({ pageParam }) => getMessages(conversationId, { cursor: pageParam, limit: pageSize }),
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < pageSize) {
        return undefined
      }

      return lastPage[0]?.created_at || undefined
    },
    select: (data) => flattenPages(data.pages),
  })

  const loadOlder = useCallback(async () => {
    if (!conversationId || !query.hasNextPage || query.isFetchingNextPage) {
      return []
    }

    await query.fetchNextPage()
    return []
  }, [conversationId, query])

  const appendMessage = useCallback(
    (message) => {
      if (!message || !conversationId) return

      queryClient.setQueryData(queryKey, (current) => {
        if (!current) {
          return { pageParams: [null], pages: [[message]] }
        }

        const pages = [...(current.pages || [])]
        let replaced = false

        const nextPages = updatePages(pages, (page) =>
          page.map((item) => {
            if (isSameMessage(item, message)) {
              replaced = true
              return message
            }

            return item
          }),
        )

        if (!replaced) {
          if (nextPages.length === 0) {
            nextPages.push([message])
          } else {
            nextPages[nextPages.length - 1] = [...nextPages[nextPages.length - 1], message]
          }
        }

        return {
          ...current,
          pages: nextPages,
        }
      })
    },
    [conversationId, queryClient, queryKey],
  )

  const updateMessage = useCallback(
    (message) => {
      if (!message || !conversationId) return

      queryClient.setQueryData(queryKey, (current) => {
        if (!current) return current

        return {
          ...current,
          pages: updatePages(current.pages || [], (page) =>
            page.map((item) => (isSameMessage(item, message) ? message : item)),
          ),
        }
      })
    },
    [conversationId, queryClient, queryKey],
  )

  const removeMessage = useCallback(
    (message) => {
      if (!message || !conversationId) return

      queryClient.setQueryData(queryKey, (current) => {
        if (!current) return current

        return {
          ...current,
          pages: (current.pages || []).map((page) => page.filter((item) => !isSameMessage(item, message))),
        }
      })
    },
    [conversationId, queryClient, queryKey],
  )

  const messages = useMemo(() => query.data || [], [query.data])

  return {
    messages,
    setMessages: () => {},
    loadingInitial: query.isLoading && !query.data,
    loadingMore: query.isFetchingNextPage,
    error: query.error?.message || '',
    hasMore: Boolean(query.hasNextPage),
    loadOlder,
    appendMessage,
    updateMessage,
    removeMessage,
    refetch: query.refetch,
  }
}
