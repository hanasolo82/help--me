import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { getMyChats } from '../../services/chatService'
import ConversationList from '../../features/chat/components/ConversationList'

export default function Chats() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const loading = !loaded

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const data = await getMyChats()
        if (cancelled) return
        setConversations(data || [])
        setError('')
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'No se pudieron cargar tus conversaciones.')
      } finally {
        if (!cancelled) {
          setLoaded(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((left, right) => {
      const leftDate = new Date(left.last_message_at || left.created_at || 0).getTime()
      const rightDate = new Date(right.last_message_at || right.created_at || 0).getTime()
      return rightDate - leftDate
    })
  }, [conversations])

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button type="button" className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          {'<'}
        </button>
        <div>
          <p className="eyebrow">Conversaciones</p>
          <h1>Tus chats privados</h1>
          <p className="muted">Solo veras conversaciones donde participas.</p>
        </div>
      </header>

      {loading && <p className="muted">Cargando...</p>}
      {error && <p className="auth-message error">{error}</p>}

      {!loading && !error && sortedConversations.length === 0 && (
        <article className="empty-state">
          <h3>Todavia no tienes conversaciones</h3>
          <p>Cuando abras un chat desde una tarea o con otro usuario, aparecera aqui.</p>
        </article>
      )}

      <ConversationList
        conversations={sortedConversations}
        currentConversationId={null}
        onSelectConversation={(conversation) => navigate(`/chat/${conversation.id}`)}
      />

      <BottomNav active="mensajes" />
    </main>
  )
}
