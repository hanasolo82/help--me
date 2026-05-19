import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import MessageList from '../../components/chat/MessageList'
import { getMessages, getOrCreateChatByTaskId } from '../../services/chatService'
import { useConversationComposer } from '../../features/chat/hooks/useConversationComposer'

function getCounterpartName(task, userId) {
  const counterpartProfile =
    task?.created_by === userId ? task?.accepted_profile : task?.creator_profile

  return (
    counterpartProfile?.display_name ||
    counterpartProfile?.full_name ||
    counterpartProfile?.username ||
    'Vecino'
  )
}

export default function TaskChatModal({ open, task, onClose }) {
  const { user } = useAuth()
  const taskChatMessagesEndRef = useRef(null)
  const taskId = task?.id
  const [status, setStatus] = useState('idle')
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const [draftMessage, setDraftMessage] = useState('')
  const appendMessage = useCallback((message) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id || item.client_temp_id === message.client_temp_id)) {
        return current
      }

      return [...current, message]
    })
  }, [])

  const updateMessage = useCallback((message) => {
    setMessages((current) =>
      current.map((item) =>
        item.id === message.id || item.client_temp_id === message.client_temp_id ? message : item,
      ),
    )
  }, [])

  const removeMessage = useCallback((message) => {
    setMessages((current) =>
      current.filter((item) => item.id !== message.id && item.client_temp_id !== message.client_temp_id),
    )
  }, [])

  const {
    sending,
    error: composerError,
    sendDraft,
    editMessageById,
    deleteMessageById,
  } = useConversationComposer(chat?.id, {
    currentUserId: user?.id,
    appendMessage,
    updateMessage,
    removeMessage,
  })

  useEffect(() => {
    if (!open || !taskId) {
      return undefined
    }

    let cancelled = false

    async function bootstrap() {
      setStatus('loading')
      setError('')
      setDraftMessage('')

      try {
        const nextChat = await getOrCreateChatByTaskId(taskId)
        if (cancelled) return

        const history = await getMessages(nextChat.id)
        if (cancelled) return

        setChat(nextChat)
        setMessages(history || [])
        setStatus('ready')
      } catch (loadError) {
        if (cancelled) return

        setStatus('error')
        setChat(null)
        setMessages([])
        setError(loadError?.message || 'No se pudo abrir el chat.')
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [open, taskId])

  useEffect(() => {
    taskChatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  if (!open || !task) {
    return null
  }

  const counterpartName = getCounterpartName(task, user?.id)

  async function handleSendTaskChatMessage(event) {
    event.preventDefault()

    const messageText = draftMessage.trim()

    if (!chat || !messageText || sending) {
      return
    }

    setError('')
    setDraftMessage('')
    try {
      await sendDraft(messageText)
    } catch (sendError) {
      setError(sendError?.message || composerError || 'No se pudo enviar el mensaje.')
    }
  }

  async function handleEditTaskChatMessage(messageId, nextContent) {
    const updated = await editMessageById(messageId, nextContent)
    setMessages((current) =>
      current.map((message) =>
        message.id === updated.id || message.client_temp_id === updated.client_temp_id ? updated : message,
      ),
    )
    return updated
  }

  async function handleDeleteTaskChatMessage(messageId) {
    await deleteMessageById(messageId)
    setMessages((current) =>
      current.filter((message) => message.id !== messageId && message.client_temp_id !== messageId),
    )
  }

  return (
    <div
      className="task-chat-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-task-chat-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="task-chat-modal">
        <header className="task-chat-header">
          <div>
            <p className="eyebrow">Mensaje</p>
            <h2 id="home-task-chat-title">{counterpartName}</h2>
            <p className="muted">{task.title}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar chat">
            ×
          </button>
        </header>

        {status === 'loading' && <p className="muted" style={{ padding: '16px' }}>Abriendo chat...</p>}
        {status === 'error' && <p className="auth-message error" style={{ margin: '16px' }}>{error}</p>}

        {status === 'ready' && (
          <>
            <section className="task-chat-messages" aria-live="polite">
              <MessageList
                messages={messages}
                currentUserId={user?.id}
                onEditMessage={handleEditTaskChatMessage}
                onDeleteMessage={handleDeleteTaskChatMessage}
              />
              <div ref={taskChatMessagesEndRef} />
            </section>

            <form className="task-chat-composer" onSubmit={handleSendTaskChatMessage}>
              <input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Escribe un mensaje"
                maxLength={1200}
                disabled={sending}
              />
              <button
                type="submit"
                className="primary-action"
                disabled={sending || !draftMessage.trim()}
              >
                Enviar
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
