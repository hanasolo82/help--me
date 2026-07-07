import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import MessageList from '../../shared/ui/chat/MessageList'
import MessageInput from '../../shared/ui/chat/MessageInput'
import UserAvatar from '../../shared/ui/UserAvatar'
import { getMessages } from '../../services/chatService'
import { useConversationComposer } from '../../features/chat/hooks/useConversationComposer'
import { useRealtimeMessages } from '../../features/chat/hooks/useRealtimeMessages'
import styles from './MessagesPage.module.css'

function getMessageKeys(message) {
  return [message?.client_temp_id, message?.id].filter(Boolean)
}

function isSameMessage(left, right) {
  if (!left || !right) return false

  const rightKeys = new Set(getMessageKeys(right))
  return getMessageKeys(left).some((key) => rightKeys.has(key))
}

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

// Hilo de una conversación (columna derecha de /messages): historial,
// composer con edición/borrado y actualizaciones en tiempo real.
export default function MessagesThread({ conversation, onBack, onOpenTask }) {
  const { user } = useAuth()
  const conversationId = conversation?.id
  const endRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')

  // Al cambiar de conversación, resetea el hilo durante el render
  // (patrón derivado-de-props de React, evita setState síncrono en effects).
  const [lastConversationId, setLastConversationId] = useState(conversationId)
  if (conversationId !== lastConversationId) {
    setLastConversationId(conversationId)
    setStatus('loading')
    setError('')
    setDraft('')
    setMessages([])
  }

  const appendMessage = useCallback((message) => {
    setMessages((current) => {
      let replaced = false
      const next = current.map((item) => {
        if (isSameMessage(item, message)) {
          replaced = true
          return message
        }
        return item
      })

      return replaced ? next : [...next, message]
    })
  }, [])

  const updateMessage = useCallback((message) => {
    setMessages((current) => current.map((item) => (isSameMessage(item, message) ? message : item)))
  }, [])

  const removeMessage = useCallback((message) => {
    setMessages((current) => current.filter((item) => !isSameMessage(item, message)))
  }, [])

  const {
    sending,
    error: composerError,
    sendDraft,
    editMessageById,
    deleteMessageById,
  } = useConversationComposer(conversationId, {
    currentUserId: user?.id,
    appendMessage,
    updateMessage,
    removeMessage,
  })

  useRealtimeMessages(conversationId, {
    onInsert: appendMessage,
    onUpdate: updateMessage,
    onDelete: removeMessage,
  })

  useEffect(() => {
    if (!conversationId) return undefined

    let cancelled = false

    getMessages(conversationId)
      .then((history) => {
        if (cancelled) return
        setMessages(history || [])
        setStatus('ready')
      })
      .catch((loadError) => {
        if (cancelled) return
        setStatus('error')
        setError(loadError?.message || 'No se pudo abrir la conversación.')
      })

    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (!conversation) {
    return null
  }

  const counterpart = conversation.other_user
  const counterpartName = getDisplayName(counterpart)

  async function handleSend() {
    const text = draft.trim()
    if (!text || sending) return

    setError('')
    setDraft('')
    try {
      await sendDraft(text)
    } catch (sendError) {
      setError(sendError?.message || composerError || 'No se pudo enviar el mensaje.')
    }
  }

  async function handleEdit(messageId, nextContent) {
    const updated = await editMessageById(messageId, nextContent)
    updateMessage(updated)
    return updated
  }

  async function handleDelete(messageId) {
    await deleteMessageById(messageId)
    setMessages((current) =>
      current.filter((message) => message.id !== messageId && message.client_temp_id !== messageId),
    )
  }

  return (
    <section className={styles.thread} aria-label={`Conversación con ${counterpartName}`}>
      <header className={styles.threadHeader}>
        {onBack ? (
          <button type="button" className={`icon-button ${styles.threadBack}`} onClick={onBack} aria-label="Volver a la lista">
            ←
          </button>
        ) : null}
        <UserAvatar src={counterpart?.avatar_url} name={counterpartName} alt={counterpartName} size="sm" />
        <div className={styles.threadHeaderCopy}>
          <strong>{counterpartName}</strong>
          {conversation.task?.title ? <p>{conversation.task.title}</p> : null}
        </div>
        {conversation.task_id ? (
          <button
            type="button"
            className={`secondary-action ${styles.threadTaskLink}`}
            onClick={() => onOpenTask?.(conversation.task_id)}
          >
            Ver tarea
          </button>
        ) : null}
      </header>

      {status === 'loading' ? <p className={`muted ${styles.threadNotice}`}>Abriendo conversación...</p> : null}
      {status === 'error' ? (
        <p className={`auth-message error ${styles.threadNotice}`} role="alert">
          {error}
        </p>
      ) : null}

      {status === 'ready' ? (
        <>
          <div className={styles.threadMessages} aria-live="polite">
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              onEditMessage={handleEdit}
              onDeleteMessage={handleDelete}
            />
            <div ref={endRef} />
          </div>

          {error ? (
            <p className={`auth-message error ${styles.threadNotice}`} role="alert">
              {error}
            </p>
          ) : null}

          <MessageInput
            value={draft}
            onChange={setDraft}
            onSubmit={handleSend}
            sending={sending}
            placeholder="Escribe un mensaje"
            maxLength={1200}
          />
        </>
      ) : null}
    </section>
  )
}
