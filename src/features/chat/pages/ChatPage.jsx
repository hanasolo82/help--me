import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { useConversation } from '../hooks/useConversation'
import { useConversationComposer } from '../hooks/useConversationComposer'
import { useMessages } from '../hooks/useMessages'
import { useTypingIndicator } from '../hooks/useTypingIndicator'
import ChatLayout from '../../../shared/ui/layouts/ChatLayout'
import UserAvatar from '../../../shared/ui/UserAvatar'
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
  const messageEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const stickToBottomRef = useRef(true)
  const loadingOlderRef = useRef(false)
  const {
    sending,
    error,
    sendDraft,
    retryMessage,
    editMessageById,
    deleteMessageById,
  } = useConversationComposer(conversationId, {
    currentUserId: user?.id,
    appendMessage,
    updateMessage,
    removeMessage,
  })

  const counterpart = conversation?.participants?.find((participant) => participant.user_id !== user?.id) || null

  const counterpartProfile = counterpart?.profile || null
  const counterpartName = getDisplayName(counterpartProfile)
  const counterpartInitial = counterpartName.charAt(0).toUpperCase()

  useEffect(() => {
    if (!stickToBottomRef.current) return
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const nextDraft = draft.trim()
    if (!nextDraft) return

    try {
      await sendDraft(nextDraft)
      setDraft('')
    } catch {
      // El error ya se expone desde el hook y se pinta en la UI.
    }
  }

  async function handleEdit(message) {
    const nextBody = window.prompt('Editar mensaje', message.body || message.content || '')
    if (nextBody == null) return

    await editMessageById(message.id, nextBody)
  }

  async function handleDelete(message) {
    await deleteMessageById(message.id)
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
    <ChatLayout
      header={
        <header className="chat-header">
          <button type="button" className="icon-button" onClick={() => navigate('/chats')} aria-label="Volver">
            {'<'}
          </button>
          <UserAvatar
            src={counterpartProfile?.avatar_url}
            name={counterpartName || counterpartInitial}
            alt={counterpartName}
            size="sm"
            className="chat-contact-avatar"
            decorative
          />
          <div className="chat-contact-copy">
            <p className="eyebrow">Conversación privada</p>
            <h1>{counterpartName}</h1>
            <p>
              {conversation.last_message_at
                ? `Última actividad ${new Date(conversation.last_message_at).toLocaleString('es-ES')}`
                : 'Sin actividad todavía'}
            </p>
          </div>
        </header>
      }
    >
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
            onRetryMessage={retryMessage}
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
    </ChatLayout>
  )
}
