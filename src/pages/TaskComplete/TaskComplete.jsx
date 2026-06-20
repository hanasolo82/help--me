import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { getTaskById, markTaskCompleted } from '../../services/tasksService'
import { releaseTaskPayment } from '../../services/paymentsService'
import { getOrCreateChatByTaskId } from '../../services/chatService'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import { resolveReturnTo } from '../../shared/utils/navigation'

function wait(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds)
  })
}

// Pantalla de cierre: el creador confirma completada. La valoración vive en public.reviews.
export default function TaskComplete() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const taskPath = `/task/${taskId}`
  const returnTo = resolveReturnTo(location.state?.returnTo, taskPath)
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
    if (!task || ['completing', 'releasing'].includes(status)) return

    let taskCompleted = task.status === 'completed'
    setError('')

    try {
      if (!['in_progress', 'completed'].includes(task.status)) {
        throw new Error('La tarea aún no puede cerrarse. Espera a que esté en curso o completada.')
      }

      if (task.status !== 'completed') {
        setStatus('completing')
        const updated = await markTaskCompleted(task.id)
        setTask(updated)
        queryClient.setQueryData(['task', task.id], updated)
        taskCompleted = true
      }

      setStatus('releasing')

      try {
        await releaseTaskPayment(task.id)
      } catch {
        await wait(900)
        await releaseTaskPayment(task.id)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', task.id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
      ])
      setStatus('done')
    } catch (err) {
      setStatus(taskCompleted ? 'release_error' : 'error')
      setError(
        taskCompleted
          ? 'La tarea quedó completada, pero no pudimos actualizar el pago todavía. Puedes reintentarlo de forma segura.'
          : err.message || 'No se pudo cerrar la tarea.',
      )
    }
  }

  function handleReject() {
    getOrCreateChatByTaskId(taskId)
      .then((chat) => navigate(`/chat/${chat.id}`, { state: { returnTo: taskPath } }))
      .catch((err) => {
        setError(err?.message || 'No se pudo abrir el chat.')
      })
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
        <section className="completion-panel">
          <p className="auth-message error">{error}</p>
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </section>
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

  if (!['in_progress', 'completed'].includes(task.status)) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <h1>La tarea aún no se puede cerrar</h1>
          <p className="muted">
            El cierre solo está disponible cuando la tarea ya está en curso. El chat se desbloqueará cuando el pago
            esté confirmado.
          </p>
          <button className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver al detalle
          </button>
        </section>
      </main>
    )
  }

  if (status === 'done') {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <p className="eyebrow">Cierre confirmado</p>
          <h1>La tarea está completada</h1>
          <p className="muted">
            Gracias por confirmar el trabajo. La actualización del pago ya está en marcha y puedes valorar al helper.
          </p>
          <div className="two-actions">
            <button className="secondary-action" onClick={() => navigate(returnTo)}>
              Volver al detalle
            </button>
            {task.accepted_by && (
              <button
                className="primary-action"
                onClick={() => navigate(`/task/${task.id}/review`, { state: { returnTo: taskPath } })}
              >
                Valorar helper
              </button>
            )}
          </div>
        </section>
      </main>
    )
  }

  if (status === 'release_error') {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <p className="eyebrow">Pago pendiente de actualizar</p>
          <h1>La tarea ya está completada</h1>
          <p className="muted">{error}</p>
          <div className="two-actions">
            <button className="secondary-action" onClick={() => navigate(returnTo)}>
              Volver al detalle
            </button>
            <button className="primary-action" onClick={handleConfirm}>
              Reintentar actualización del pago
            </button>
          </div>
        </section>
      </main>
    )
  }

  const actionPending = ['completing', 'releasing'].includes(status)

  return (
    <main className="app-screen center-screen">
      <section className="completion-panel">
        <p className="eyebrow">Tarea</p>
        <h1>Confirma que la tarea se ha completado</h1>
        <p className="muted">
          {task.title}. Al cerrar la tarea confirmas que el trabajo terminó y HelpMe puede iniciar la liberación del
          pago si aplica.
        </p>

        <div className="two-actions">
          <button className="secondary-action" onClick={handleReject} disabled={actionPending}>
            No, volver al chat
          </button>
          <button className="success-action" onClick={handleConfirm} disabled={actionPending}>
            {actionPending ? 'Cerrando...' : 'Sí, cerrar tarea'}
          </button>
        </div>

        {error && <p className="auth-message error">{error}</p>}
      </section>
      <ActionStatusOverlay
        open={actionPending}
        title={status === 'releasing' ? 'Cerrando tarea y actualizando pago...' : 'Confirmando la tarea...'}
        message={
          status === 'releasing'
            ? 'La tarea ya está completada. Estamos iniciando la actualización segura del pago.'
            : 'Estamos guardando que el trabajo ha terminado.'
        }
      />
    </main>
  )
}
