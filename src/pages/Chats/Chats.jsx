import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { useAuth } from '../../contexts/useAuth'
import { getMyChats } from '../../services/chatService'

// Lista de chats reales del usuario autenticado. Sin embed de profiles: mostramos
// el titulo de la tarea y un id corto del otro usuario como referencia.
export default function Chats() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getMyChats()
      .then((data) => {
        if (!cancelled) setChats(data || [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudieron cargar tus chats.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Conversaciones</p>
          <h1>Tus chats</h1>
        </div>
      </header>

      {loading && <p className="muted">Cargando...</p>}
      {error && <p className="auth-message error">{error}</p>}

      {!loading && !error && chats.length === 0 && (
        <article className="empty-state">
          <h3>Todavia no tienes chats</h3>
          <p>Cuando aceptes una tarea o alguien acepte la tuya, aparecera aqui.</p>
        </article>
      )}

      <ul className="chat-list">
        {chats.map((chat) => {
          const counterpartId = chat.user1_id === user?.id ? chat.user2_id : chat.user1_id
          const name = counterpartId ? `Usuario ${counterpartId.slice(0, 6)}` : 'Vecino'
          const initial = name.charAt(8)?.toUpperCase() || 'U'
          return (
            <li key={chat.id}>
              <button className="chat-list-item" onClick={() => navigate(`/chat/${chat.task_id}`)}>
                <span className="avatar-small">{initial}</span>
                <span>
                  <strong>{name}</strong>
                  <p>{chat.task?.title} · {chat.task?.status}</p>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <BottomNav active="chats" />
    </main>
  )
}
