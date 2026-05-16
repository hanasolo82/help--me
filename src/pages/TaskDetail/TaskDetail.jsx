import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { acceptTask, getTaskById } from '../../services/tasksService'
import {
  deleteMessage,
  getMessages,
  getOrCreateChatByTaskId,
  sendMessage,
  updateMessage,
  subscribeToMessages,
} from '../../services/chatService'
import { createOptimisticMessage, markOptimisticMessageFailed } from '../../features/chat/utils/optimisticMessages'
import { getAvatarInitial } from '../../utils/avatar'
import MessageList from '../../components/chat/MessageList'
import messageIcon from '../../assets/icons/message.svg'

// Detalle de tarea conectado a Supabase. Permite aceptarla o abrir chat con el creador.
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [taskState, setTaskState] = useState({ taskId: '', task: null, error: '' })
  const [accepting, setAccepting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [chatOpen, setChatOpen] = useState(Boolean(location.state?.openChat))
  const [chatState, setChatState] = useState({ status: 'idle', chat: null, messages: [], error: '' })
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef(null)

  const loading = taskState.taskId !== id
  const task = loading ? null : taskState.task
  const error = actionError || (loading ? '' : taskState.error)

  useEffect(() => {
    let cancelled = false

    getTaskById(id)
      .then((data) => {
        if (cancelled) return
        setActionError('')
        if (!data) {
          setTaskState({
            taskId: id,
            task: null,
            error: 'Tarea no encontrada o ya no esta disponible.',
          })
          return
        }
        setTaskState({ taskId: id, task: data, error: '' })
      })
      .catch((err) => {
        if (!cancelled) {
          setTaskState({
            taskId: id,
            task: null,
            error: err.message || 'No se pudo cargar la tarea.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (location.state?.openChat) {
      setChatOpen(true)
    }
  }, [location.state?.openChat])

  useEffect(() => {
    if (!chatOpen || !task) {
      return undefined
    }

    let cancelled = false
    let unsubscribe = null

    async function bootstrapChat() {
      setChatState({ status: 'loading', chat: null, messages: [], error: '' })

      try {
        const chat = await getOrCreateChatByTaskId(id)
        if (cancelled) return

        const history = await getMessages(chat.id)
        if (cancelled) return

        setChatState({ status: 'ready', chat, messages: history || [], error: '' })
        unsubscribe = subscribeToMessages(chat.id, {
          onInsert: (newMessage) => {
            setChatState((current) => {
              if (current.chat?.id !== chat.id) {
                return current
              }

              if (current.messages.some((message) => message.id === newMessage.id)) {
                return current
              }

              return {
                ...current,
                messages: [...current.messages, newMessage],
              }
            })
          },
          onUpdate: (updatedMessage) => {
            setChatState((current) => ({
              ...current,
              messages: current.messages.map((message) =>
                message.id === updatedMessage.id ? updatedMessage : message,
              ),
            }))
          },
          onDelete: (deletedMessage) => {
            setChatState((current) => ({
              ...current,
              messages: current.messages.filter((message) => message.id !== deletedMessage.id),
            }))
          },
        })
      } catch (err) {
        if (cancelled) return
        setChatState({
          status: 'error',
          chat: null,
          messages: [],
          error: err.message || 'No se pudo abrir el chat.',
        })
      }
    }

    bootstrapChat()

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [chatOpen, id, task])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatOpen, chatState.messages])

  async function handleAccept() {
    setAccepting(true)
    setActionError('')

    try {
      const { conversation } = await acceptTask(id)
      navigate(`/chat/${conversation.id}`, { replace: true })
    } catch (err) {
      setActionError(err.message || 'No se pudo aceptar la tarea.')
      setAccepting(false)
    }
  }

  function handleOpenChat() {
    setActionError('')
    setChatOpen(true)
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!chatState.chat || !messageText.trim() || sendingMessage) {
      return
    }

    setSendingMessage(true)
    setChatState((current) => ({ ...current, error: '' }))
    const tempMessage = createOptimisticMessage({
      conversationId: chatState.chat.id,
      senderId: user?.id,
      body: messageText.trim(),
    })
    setChatState((current) => ({
      ...current,
      messages: [...current.messages, tempMessage],
    }))
    setMessageText('')

    try {
      const sentMessage = await sendMessage(chatState.chat.id, messageText, tempMessage.client_temp_id)
      setChatState((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === tempMessage.id || message.client_temp_id === tempMessage.client_temp_id
            ? { ...sentMessage, client_temp_id: tempMessage.client_temp_id }
            : message,
        ),
      }))
    } catch (err) {
      setChatState((current) => ({
        ...current,
        error: err.message || 'No se pudo enviar el mensaje.',
        messages: current.messages.map((message) =>
          message.id === tempMessage.id || message.client_temp_id === tempMessage.client_temp_id
            ? markOptimisticMessageFailed(message, err.message || 'No se pudo enviar el mensaje.')
            : message,
        ),
      }))
    } finally {
      setSendingMessage(false)
    }
  }

  async function handleEditMessage(messageId, nextContent) {
    const updated = await updateMessage(messageId, nextContent)
    setChatState((current) => ({
      ...current,
      messages: current.messages.map((message) => (message.id === updated.id ? updated : message)),
    }))
    return updated
  }

  async function handleDeleteMessage(messageId) {
    await deleteMessage(messageId)
    setChatState((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== messageId),
    }))
  }

  if (loading) {
    return (
      <main className="app-screen">
        <p className="muted">Cargando tarea...</p>
      </main>
    )
  }

  if (!task) {
    return (
      <main className="app-screen">
        <header className="page-header">
          <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
            ←
          </button>
          <h1>Tarea no disponible</h1>
        </header>
        <p className="auth-message error">{error}</p>
      </main>
    )
  }

  const isOwner = user?.id === task.created_by
  const isHelper = user?.id === task.accepted_by
  const creatorProfile = task.creator_profile || {}
  const creatorName = creatorProfile.display_name || creatorProfile.full_name || creatorProfile.username || 'Vecino'
  const creatorInitial = getAvatarInitial(creatorName)
  const priceEuros = Number(task.price ?? 0)
  const canAccept = !isOwner && task.status === 'open' && !task.accepted_by
  const canOpenChat =
    (task.status === 'open' && !isOwner) ||
    (['assigned', 'in_progress', 'completed'].includes(task.status) && (isOwner || isHelper))

  return (
    <main className="app-screen">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Detalle de tarea</p>
          <h1>{task.title}</h1>
        </div>
      </header>

      <section className="detail-panel">
        <div className="user-strip">
          <span className="avatar-small">
            {creatorProfile.avatar_url ? <img src={creatorProfile.avatar_url} alt={creatorName} /> : creatorInitial}
          </span>
          <div>
            <strong>{creatorName}</strong>
            <p>{creatorProfile.rating ? `${creatorProfile.rating}/5` : 'Vecino de confianza'}</p>
          </div>
        </div>

        <div className="detail-row">
          <span>Ubicacion Aproximada</span>
          <strong>{`${Number(task.lat).toFixed(3)}, ${Number(task.lng).toFixed(3)}`}</strong>
        </div>
        <div className="detail-row">
          <span>Precio</span>
          <strong>{priceEuros} EUR</strong>
        </div>
        <div className="detail-row">
          <span>Categoria</span>
          <strong>{task.category}</strong>
        </div>
        <div className="detail-row">
          <span>Estado</span>
          <strong>{task.status}</strong>
        </div>
      </section>

      <section className="detail-panel">
        <h2>Descripcion</h2>
        <p>{task.description}</p>
      </section>

      {error && <p className="auth-message error">{error}</p>}

      <div className="two-actions">
        {canOpenChat && (
          <button
            type="button"
            className="icon-button message-action"
            onClick={handleOpenChat}
            aria-label="Abrir chat"
            title="Abrir chat"
          >
            <img src={messageIcon} alt="" aria-hidden="true" />
          </button>
        )}

        {canAccept && (
          <button className="primary-action sticky-action" onClick={handleAccept} disabled={accepting}>
            {accepting ? 'Aceptando...' : 'Aceptar tarea'}
          </button>
        )}
      </div>

      {isOwner && task.status === 'open' && (
        <p className="muted">Esta es tu tarea. Espera a que alguien la acepte.</p>
      )}

      {isOwner && task.status === 'draft' && (
        <p className="muted">Esta tarea sigue como borrador. Publicala desde "Tareas solicitadas" cuando quieras.</p>
      )}

      {isOwner && task.status === 'cancelled' && (
        <p className="muted">Esta tarea se ha cancelado y ya no aparece en la lista principal.</p>
      )}

      {chatOpen && (
        <div
          className="task-chat-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-chat-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setChatOpen(false)
            }
          }}
        >
          <section className="task-chat-modal">
            <header className="task-chat-header">
              <div>
                <p className="eyebrow">Mensaje</p>
                <h2 id="task-chat-title">{creatorName}</h2>
                <p className="muted">{task.title}</p>
              </div>
              <button className="icon-button" onClick={() => setChatOpen(false)} aria-label="Cerrar chat">
                ×
              </button>
            </header>

            {chatState.status === 'loading' && <p className="muted" style={{ padding: '16px' }}>Abriendo chat...</p>}
            {chatState.status === 'error' && <p className="auth-message error" style={{ margin: '16px' }}>{chatState.error}</p>}

            {chatState.status === 'ready' && (
              <>
                <section className="task-chat-messages" aria-live="polite">
                  <MessageList
                    messages={chatState.messages}
                    currentUserId={user?.id}
                    onEditMessage={handleEditMessage}
                    onDeleteMessage={handleDeleteMessage}
                  />
                  <div ref={messagesEndRef} />
                </section>

                <form className="task-chat-composer" onSubmit={handleSendMessage}>
                  <input
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Escribe un mensaje"
                    maxLength={1200}
                    disabled={sendingMessage}
                  />
                  <button type="submit" className="primary-action" disabled={sendingMessage || !messageText.trim()}>
                    Enviar
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
