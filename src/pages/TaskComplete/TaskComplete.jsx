import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { getTaskById, markTaskCompleted, rateCompletedTask } from '../../services/tasksService'

// Pantalla de cierre: el requester confirma completada y valora al helper. El trigger SQL
// actualiza el rating promedio y completed_tasks del helper automaticamente.
export default function TaskComplete() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
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

      if (task.helper_id) {
        await rateCompletedTask({
          taskId: task.id,
          ratedId: task.helper_id,
          score: Number(rating),
          comment: comment || null,
        })
      }

      setStatus('done')
      navigate('/home', { replace: true })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo cerrar la tarea.')
    }
  }

  async function handleReject() {
    setStatus('loading')
    try {
      navigate(`/chat/${taskId}`)
    } finally {
      setStatus('idle')
    }
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

  const isRequester = user?.id === task.requester_id

  if (!isRequester) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <h1>Solo el solicitante puede cerrar la tarea</h1>
          <p className="muted">Espera a que la otra persona confirme el cierre.</p>
          <button className="primary-action" onClick={() => navigate(`/chat/${taskId}`)}>
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
            {status === 'loading' ? 'Cerrando...' : 'Si, cerrar y valorar'}
          </button>
        </div>

        <label className="field">
          <span>Valoracion al ayudante</span>
          <input
            type="range"
            min="1"
            max="5"
            value={rating}
            onChange={(event) => setRating(event.target.value)}
          />
        </label>
        <p className="rating-value">{rating} / 5</p>

        <label className="field">
          <span>Comentario (opcional)</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={600}
            rows={3}
            placeholder="Cuenta como fue la experiencia"
          />
        </label>

        {error && <p className="auth-message error">{error}</p>}
      </section>
    </main>
  )
}
