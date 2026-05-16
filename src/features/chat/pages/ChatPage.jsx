import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import {
  editMessage,
  markConversationAsRead,
  sendMessage,
  softDeleteMessage,
} from '../api/chatApi'
import { useConversation } from '../hooks/useConversation'
import { useMessages } from '../hooks/useMessages'
import { useRealtimeMessages } from '../hooks/useRealtimeMessages'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import { createOptimisticMessage, markOptimisticMessageFailed } from '../utils/optimisticMessages'
import MessageList from '../components/MessageList'
import MessageInput from '../components/MessageInput'
import TypingIndicator from '../components/TypingIndicator'

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

export default function ChatPage() {
  const { id: conversationId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { conversation, loading: conversationLoading, error: conversationError } = useConversation(conversationId)
  const {
    messages,
    loadingInitial,
    loadingMore,
    error: messagesError,
    hasMore,
    loadOlder,
    appendMessage,
    updateMessage,
    removeMessage,
  } = useMessages(conversationId)
  const { typingUsers, setTyping } = useTypingIndicator(conversationId)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messageEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const stickToBottomRef = useRef(true)
  const loadingOlderRef = useRef(false)

  useRealtimeMessages(conversationId, {
    onInsert: (message) => {
      if (!message) return
      appendMessage(message)
    },
    onUpdate: (nextMessage) => {
      if (!nextMessage) return
      updateMessage(nextMessage)
      if (nextMessage.deleted_at) {
        // Keep soft-deleted messages visible with their deleted marker.
        updateMessage(nextMessage)
      }
    },
    onDelete: (deletedMessage) => {
      if (!deletedMessage) return
      removeMessage(deletedMessage)
    },
  })

  const counterpart = conversation?.participants?.find((participant) => participant.user_id !== user?.id) || null

  const counterpartProfile = counterpart?.profile || null
  const counterpartName = getDisplayName(counterpartProfile)

  useEffect(() => {
    if (!stickToBottomRef.current) return
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!conversationId || !conversation) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      markConversationAsRead(conversationId).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timer)
  }, [conversation, conversationId])

  async function handleSend() {
    if (!draft.trim() || sending || !conversationId || !user?.id) return

    const tempMessage = createOptimisticMessage({
      conversationId,
      senderId: user.id,
      body: draft.trim(),
    })

    setDraft('')
    setError('')
    setSending(true)
    appendMessage(tempMessage)

    try {
      const persisted = await sendMessage(conversationId, draft.trim(), tempMessage.client_temp_id)
      updateMessage({
        ...persisted,
        client_temp_id: tempMessage.client_temp_id,
      })
      setDraft('')
    } catch (err) {
      updateMessage(markOptimisticMessageFailed(tempMessage, err?.message || 'No se pudo enviar el mensaje.'))
      setError(err?.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  async function handleRetry(message) {
    if (!message?.client_temp_id || sending) return

    setError('')
    setSending(true)

    try {
      const persisted = await sendMessage(conversationId, message.body || message.content, message.client_temp_id)
      updateMessage({
        ...persisted,
        client_temp_id: message.client_temp_id,
      })
    } catch (err) {
      updateMessage(markOptimisticMessageFailed(message, err?.message || 'No se pudo enviar el mensaje.'))
      setError(err?.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  async function handleEdit(message) {
    const nextBody = window.prompt('Editar mensaje', message.body || message.content || '')
    if (nextBody == null) return

    const persisted = await editMessage(message.id, nextBody)
    updateMessage(persisted)
  }

  async function handleDelete(message) {
    const persisted = await softDeleteMessage(message.id)
    updateMessage(persisted)
  }

  if (conversationLoading) {
    return (
      <main className="app-screen center-screen">
        <p className="muted">Cargando conversacion...</p>
      </main>
    )
  }

  if (conversationError || !conversation) {
    return (
      <main className="app-screen center-screen">
        <section className="auth-panel">
          <p className="eyebrow">Chat</p>
          <h1>No hemos podido abrir la conversacion</h1>
          <p className="auth-message error">{conversationError || 'La conversacion no existe o no tienes acceso.'}</p>
          <button type="button" className="primary-action" onClick={() => navigate('/chats')}>
            Volver a chats
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-screen">
      <section className="chat-screen">
        <header className="chat-header">
          <button type="button" className="icon-button" onClick={() => navigate('/chats')} aria-label="Volver">
            {'<'}
          </button>
          <div>
            <p className="eyebrow">Conversacion privada</p>
            <h1>{counterpartName}</h1>
            <p>{conversation.last_message_at ? `Ultima actividad ${new Date(conversation.last_message_at).toLocaleString('es-ES')}` : 'Sin actividad todavia'}</p>
          </div>
        </header>

        <section
          ref={scrollContainerRef}
          className="messages"
          aria-live="polite"
          onScroll={(event) => {
            const element = event.currentTarget
            const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight
            stickToBottomRef.current = distanceToBottom < 120
          }}
        >
          {messagesError && <p className="auth-message error">{messagesError}</p>}

          {loadingInitial ? (
            <p className="muted">Cargando mensajes...</p>
          ) : (
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              onEditMessage={handleEdit}
              onDeleteMessage={handleDelete}
              onRetryMessage={handleRetry}
              loadingMore={loadingMore}
              hasMore={hasMore}
              onLoadMore={async () => {
                const beforeHeight = scrollContainerRef.current?.scrollHeight || 0
                loadingOlderRef.current = true
                await loadOlder()
                requestAnimationFrame(() => {
                  const nextHeight = scrollContainerRef.current?.scrollHeight || 0
                  if (scrollContainerRef.current && loadingOlderRef.current) {
                    scrollContainerRef.current.scrollTop += nextHeight - beforeHeight
                  }
                  loadingOlderRef.current = false
                })
              }}
            />
          )}

          <div ref={messageEndRef} />
        </section>

        <div style={{ padding: '0 16px 8px' }}>
          <TypingIndicator typingUsers={typingUsers} />
          {error && <p className="auth-message error">{error}</p>}
        </div>

        <MessageInput
          value={draft}
          onChange={(value) => {
            setDraft(value)
            setTyping(Boolean(value.trim())).catch(() => {})
          }}
          onSubmit={handleSend}
          sending={sending}
          placeholder="Escribe un mensaje"
          maxLength={2000}
        />
      </section>
    </main>
  )
}
