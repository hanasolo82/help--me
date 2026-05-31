import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { getTaskById, markTaskCompleted } from '../../services/tasksService'
import { releaseTaskPayment } from '../../services/paymentsService'
import { getOrCreateChatByTaskId } from '../../services/chatService'

// Pantalla de cierre: el creador confirma completada. No hay tabla ratings en este esquema.
export default function TaskComplete() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getTaskById(taskId)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError('Tarea no encontrada.')
          return
        }
        setTask(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [taskId])

  async function handleConfirm() {
    if (!task) return
    setStatus('loading')
    setError('')

    try {
      if (task.status !== 'completed') {
        const updated = await markTaskCompleted(task.id)
        setTask(updated)
      }

      await releaseTaskPayment(task.id)

      setStatus('done')
      navigate('/home', { replace: true })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo cerrar la tarea.')
    }
  }

  function handleReject() {
    getOrCreateChatByTaskId(taskId)
      .then((chat) => navigate(`/chat/${chat.id}`))
      .catch(() => navigate('/chats'))
  }

  if (!task && !error) {
    return (
      <main className="app-screen center-screen">
        <p className="muted">Cargando tarea...</p>
      </main>
    )
  }

  if (!task) {
    return (
      <main className="app-screen center-screen">
        <p className="auth-message error">{error}</p>
      </main>
    )
  }

  const isRequester = user?.id === task.created_by

  if (!isRequester) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <h1>Solo el solicitante puede cerrar la tarea</h1>
          <p className="muted">Espera a que la otra persona confirme el cierre.</p>
          <button className="primary-action" onClick={handleReject}>
            Volver al chat
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-screen center-screen">
      <section className="completion-panel">
        <p className="eyebrow">Tarea</p>
        <h1>Se ha completado la tarea?</h1>
        <p className="muted">{task.title}</p>

        <div className="two-actions">
          <button className="secondary-action" onClick={handleReject} disabled={status === 'loading'}>
            No, volver al chat
          </button>
          <button className="success-action" onClick={handleConfirm} disabled={status === 'loading'}>
            {status === 'loading' ? 'Cerrando...' : 'Si, cerrar'}
          </button>
        </div>

        {error && <p className="auth-message error">{error}</p>}
      </section>
    </main>
  )
}
