import { useLocation, useNavigate } from 'react-router-dom'
import ConversationList from '../../features/chat/components/ConversationList'
import { useChats } from '../../hooks/useChats'
import { resolveReturnTo } from '../../shared/utils/navigation'

export default function Chats() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = resolveReturnTo(location.state?.returnTo, '/home')
  const {
    chats: conversations,
    isLoading: loading,
    error,
  } = useChats()

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button type="button" className="icon-button" onClick={() => navigate(returnTo)} aria-label="Volver">
          {'<'}
        </button>
        <div>
          <p className="eyebrow">Mensajes</p>
          <h1>Chats de tus tareas</h1>
          <p className="muted">Cada conversación se abre dentro de la tarea a la que pertenece.</p>
        </div>
      </header>

      {loading && <p className="muted">Cargando...</p>}
      {error && <p className="auth-message error">{error}</p>}

      {!loading && !error && conversations.length === 0 && (
        <article className="empty-state">
          <h3>Todavia no tienes conversaciones</h3>
          <p>Cuando abras un chat desde una tarea o con otro usuario, aparecera aqui.</p>
        </article>
      )}

      <ConversationList
        conversations={conversations}
        currentConversationId={null}
        onSelectConversation={(conversation) => {
          if (conversation.task_id) {
            navigate(`/task/${conversation.task_id}`, {
              state: {
                openChat: true,
                conversationId: conversation.id,
                returnTo: '/chats',
              },
            })
            return
          }

          navigate(`/chat/${conversation.id}`, { state: { returnTo: '/chats' } })
        }}
      />
    </main>
  )
}
