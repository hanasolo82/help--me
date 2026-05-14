import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { acceptTask, getTaskById } from '../../services/tasksService'
import { useAuth } from '../../contexts/useAuth'

// Detalle de tarea conectado a Supabase. Permite aceptarla si el visitante no es el creador.
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [taskState, setTaskState] = useState({ taskId: '', task: null, error: '' })
  const [accepting, setAccepting] = useState(false)
  const [actionError, setActionError] = useState('')
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

  async function handleAccept() {
    setAccepting(true)
    setActionError('')

    try {
      await acceptTask(id)
      navigate(`/chat/${id}`, { replace: true })
    } catch (err) {
      setActionError(err.message || 'No se pudo aceptar la tarea.')
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

  const isOwner = user?.id === task.created_by
  const isHelper = user?.id === task.accepted_by
  const priceEuros = Number(task.price ?? 0)
  const canAccept = !isOwner && task.status === 'open' && !task.accepted_by
  const canOpenChat = !canAccept && (isOwner || isHelper) && ['assigned', 'in_progress', 'completed'].includes(task.status)

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

      {canAccept && (
        <button className="primary-action sticky-action" onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Aceptando...' : 'Aceptar tarea'}
        </button>
      )}

      {canOpenChat && (
        <button className="primary-action sticky-action" onClick={() => navigate(`/chat/${task.id}`)}>
          Abrir chat
        </button>
      )}

      {isOwner && task.status === 'open' && (
        <p className="muted">Esta es tu tarea. Espera a que alguien la acepte.</p>
      )}

      {isOwner && task.status === 'draft' && (
        <p className="muted">Esta tarea sigue como borrador. Publicala desde "Tareas solicitadas" cuando quieras.</p>
      )}

      {isOwner && task.status === 'cancelled' && (
        <p className="muted">Esta tarea se ha cancelado y ya no aparece en la lista principal.</p>
      )}
    </main>
  )
}
