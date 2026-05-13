import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import {
  getChatByTaskId,
  getMessages,
  sendMessage,
  subscribeToMessages,
} from '../../services/chatService'

// Chat real conectado a Supabase con suscripcion realtime de mensajes y envio validado.
export default function Chat() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chat, setChat] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe = null
    setLoading(true)

    async function bootstrap() {
      try {
        const chatRow = await getChatByTaskId(taskId)
        if (cancelled) return

        if (!chatRow) {
          setError('No hay un chat para esta tarea todavia.')
          setLoading(false)
          return
        }

        setChat(chatRow)

        const history = await getMessages(chatRow.id)
        if (cancelled) return
        setMessages(history)
        setLoading(false)

        unsubscribe = subscribeToMessages(chatRow.id, (newMessage) => {
          setMessages((current) => {
            if (current.some((message) => message.id === newMessage.id)) return current
            return [...current, newMessage]
          })
        })
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'No se pudo cargar el chat.')
        setLoading(false)
      }
    }

    bootstrap()

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [taskId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(event) {
    event.preventDefault()
    if (!chat || !content.trim()) return
    setSending(true)
    setError('')

    try {
      await sendMessage(chat.id, content)
      setContent('')
    } catch (err) {
      setError(err.message || 'No se pudo enviar el mensaje.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <main className="chat-screen">
        <p className="muted">Cargando chat...</p>
      </main>
    )
  }

  if (!chat) {
    return (
      <main className="chat-screen">
        <header className="chat-header">
          <button className="icon-button" onClick={() => navigate(`/task/${taskId}`)} aria-label="Volver">
            ←
          </button>
          <h1>Chat no disponible</h1>
        </header>
        <p className="auth-message error">{error || 'Acepta la tarea para abrir un chat.'}</p>
      </main>
    )
  }

  const isRequester = user?.id === chat.task?.created_by
  const counterpartId = chat.user1_id === user?.id ? chat.user2_id : chat.user1_id
  const counterpartLabel = counterpartId ? `Usuario ${counterpartId.slice(0, 6)}` : 'Vecino'

  return (
    <main className="chat-screen">
      <header className="chat-header">
        <button className="icon-button" onClick={() => navigate(`/task/${taskId}`)} aria-label="Volver">
          ←
        </button>
        <div>
          <strong>{counterpartLabel}</strong>
          <p>{chat.task?.title}</p>
        </div>
      </header>

      <section className="messages" aria-live="polite">
        {messages.length === 0 && (
          <p className="muted">Aun no hay mensajes. Saluda para empezar.</p>
        )}
        {messages.map((message) => (
          <p
            key={message.id}
            className={message.sender_id === user?.id ? 'message outgoing' : 'message incoming'}
          >
            {message.content}
          </p>
        ))}
        <div ref={messagesEndRef} />
      </section>

      {error && <p className="auth-message error">{error}</p>}

      <form className="chat-composer" onSubmit={handleSend}>
        <input
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Escribe un mensaje"
          maxLength={1200}
          disabled={sending}
        />
        <button type="submit" className="primary-action" disabled={sending || !content.trim()}>
          Enviar
        </button>
      </form>

      <footer className="chat-actions">
        {isRequester && chat.task?.status !== 'completed' && (
          <button className="success-action" onClick={() => navigate(`/complete/${taskId}`)}>
            Marcar completada
          </button>
        )}
      </footer>
    </main>
  )
}
