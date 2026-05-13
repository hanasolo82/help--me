import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptTask, getTaskById } from '../../services/tasksService'
import { useAuth } from '../../contexts/useAuth'

// Detalle de tarea conectado a Supabase. Permite aceptarla si el visitante no es el requester.
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getTaskById(id)
      .then((data) => {
        if (cancelled) return
        if (!data) {
          setError('Tarea no encontrada o ya no esta disponible.')
        }
        setTask(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'No se pudo cargar la tarea.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  async function handleAccept() {
    setAccepting(true)
    setError('')

    try {
      await acceptTask(id)
      navigate(`/chat/${id}`, { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo aceptar la tarea.')
      setAccepting(false)
    }
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

  const requester = task.requester || {}
  const isOwner = user?.id === task.requester_id
  const isHelper = user?.id === task.helper_id
  const priceEuros = Math.round((task.price_cents ?? 0) / 100)
  const canAccept = !isOwner && task.status === 'open' && !task.helper_id
  const ratingLabel = requester.completed_tasks > 0
    ? `${requester.rating ?? 0} estrellas · ${requester.completed_tasks} tareas completadas`
    : 'Sin valoraciones todavia'

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

      {task.image_url && (
        <img className="task-detail-image" src={task.image_url} alt={task.title} />
      )}

      <section className="detail-panel">
        <div className="detail-row">
          <span>Ubicacion</span>
          <strong>{requester.neighborhood || `${task.latitude.toFixed(3)}, ${task.longitude.toFixed(3)}`}</strong>
        </div>
        <div className="detail-row">
          <span>Precio</span>
          <strong>{priceEuros} EUR</strong>
        </div>
        <div className="detail-row">
          <span>Urgencia</span>
          <strong>{task.urgency}</strong>
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

      <section className="user-strip">
        <div className="avatar-small">
          {requester.avatar_url
            ? <img src={requester.avatar_url} alt={requester.full_name || requester.username} />
            : (requester.full_name?.charAt(0).toUpperCase() || '?')}
        </div>
        <div>
          <strong>{requester.full_name || requester.username || 'Usuario helpMe'}</strong>
          <p>{ratingLabel}</p>
        </div>
      </section>

      {error && <p className="auth-message error">{error}</p>}

      {canAccept && (
        <button className="primary-action sticky-action" onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Aceptando...' : 'Aceptar tarea'}
        </button>
      )}

      {!canAccept && (isOwner || isHelper) && task.status !== 'open' && (
        <button className="primary-action sticky-action" onClick={() => navigate(`/chat/${task.id}`)}>
          Abrir chat
        </button>
      )}

      {isOwner && task.status === 'open' && (
        <p className="muted">Esta es tu tarea. Espera a que alguien la acepte.</p>
      )}
    </main>
  )
}
