import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import MessageList from '../../shared/ui/chat/MessageList'
import MessageInput from '../../features/chat/components/MessageInput'
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

function getMessageKeys(message) {
  return [message?.client_temp_id, message?.id].filter(Boolean)
}

function isSameMessage(left, right) {
  if (!left || !right) return false

  const rightKeys = new Set(getMessageKeys(right))
  return getMessageKeys(left).some((key) => rightKeys.has(key))
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
      let replaced = false
      const nextMessages = current.map((item) => {
        if (isSameMessage(item, message)) {
          replaced = true
          return message
        }

        return item
      })

      if (replaced) {
        return nextMessages
      }

      return [...current, message]
    })
  }, [])

  const updateMessage = useCallback((message) => {
    setMessages((current) =>
      current.map((item) =>
        isSameMessage(item, message) ? message : item,
      ),
    )
  }, [])

  const removeMessage = useCallback((message) => {
    setMessages((current) =>
      current.filter((item) => !isSameMessage(item, message)),
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

  async function handleSendTaskChatMessage() {
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
        isSameMessage(message, updated) ? updated : message,
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

            <div className="task-chat-composer-stacked">
              <MessageInput
                dense
                value={draftMessage}
                onChange={setDraftMessage}
                onSubmit={handleSendTaskChatMessage}
                sending={sending}
                placeholder="Escribe un mensaje"
                maxLength={1200}
              />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
