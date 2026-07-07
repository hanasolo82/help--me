import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useConversation } from '../hooks/useConversation'
import { resolveReturnTo } from '../../../shared/utils/navigation'

export default function ChatPage() {
  const { id: conversationId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { conversation, loading, error } = useConversation(conversationId)
  const returnTo = resolveReturnTo(location.state?.returnTo, '/messages')

  useEffect(() => {
    if (!conversation?.task_id) return

    navigate(`/task/${conversation.task_id}`, {
      replace: true,
      state: {
        openChat: true,
        conversationId: conversation.id,
        returnTo,
      },
    })
  }, [conversation?.id, conversation?.task_id, navigate, returnTo])

  if (loading || conversation?.task_id) {
    return (
      <main className="app-screen center-screen">
        <p className="muted">
          {conversation?.task_id ? 'Abriendo el chat dentro de la tarea...' : 'Buscando la tarea de este chat...'}
        </p>
      </main>
    )
  }

  return (
    <main className="app-screen center-screen">
      <section className="auth-panel">
        <p className="eyebrow">Mensajes</p>
        <h1>{error ? 'No hemos podido resolver la conversación' : 'Este chat no tiene una tarea asociada'}</h1>
        <p className={error ? 'auth-message error' : 'muted'}>
          {error ||
            'Esta conversación antigua no puede abrirse fuera de contexto. Vuelve a tus tareas para continuar desde el flujo de tarea.'}
        </p>
        <div className="two-actions">
          <button
            type="button"
            className="primary-action"
            onClick={() => navigate('/home', { state: { mode: 'need' } })}
          >
            Volver a mis tareas
          </button>
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </div>
      </section>
    </main>
  )
}
