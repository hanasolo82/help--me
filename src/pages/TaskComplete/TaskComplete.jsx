import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { getTaskById, markTaskCompleted } from '../../services/tasksService'
import { getPaymentForTask, releaseTaskPayment } from '../../services/paymentsService'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import { resolveReturnTo } from '../../shared/utils/navigation'

const INITIAL_LOAD_TIMEOUT_MS = 10_000
const COMPLETE_TIMEOUT_MS = 12_000
const RELEASE_TIMEOUT_MS = 15_000
const INVALIDATION_TIMEOUT_MS = 8_000
const REFRESH_TIMEOUT_MS = 5_000

function withTimeout(promise, milliseconds, timeoutMessage, onTimeout = null) {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      onTimeout?.()
      reject(new Error(timeoutMessage))
    }, milliseconds)

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      (error) => {
        window.clearTimeout(timeoutId)
        reject(error)
      },
    )
  })
}

function withAbortableTimeout(operation, milliseconds, timeoutMessage) {
  const controller = new AbortController()

  return withTimeout(
    operation(controller.signal),
    milliseconds,
    timeoutMessage,
    () => controller.abort(),
  )
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
  const [paymentStatus, setPaymentStatus] = useState('')

  useEffect(() => {
    let cancelled = false
    withTimeout(
      getTaskById(taskId),
      INITIAL_LOAD_TIMEOUT_MS,
      'La tarea está tardando más de lo normal en cargar.',
    )
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

  async function refreshCompletionState() {
    const [taskResult, paymentResult] = await Promise.allSettled([
      withTimeout(getTaskById(taskId), REFRESH_TIMEOUT_MS, 'No pudimos refrescar la tarea a tiempo.'),
      withTimeout(getPaymentForTask(taskId), REFRESH_TIMEOUT_MS, 'No pudimos refrescar el pago a tiempo.'),
    ])

    if (taskResult.status === 'fulfilled' && taskResult.value) {
      setTask(taskResult.value)
      queryClient.setQueryData(['task', taskId], taskResult.value)
    }

    if (paymentResult.status === 'fulfilled') {
      setPaymentStatus(paymentResult.value?.status || '')
      queryClient.setQueryData(['task-payment-status', taskId], paymentResult.value)
    }

    return {
      task: taskResult.status === 'fulfilled' ? taskResult.value : null,
      payment: paymentResult.status === 'fulfilled' ? paymentResult.value : null,
    }
  }

  async function handleConfirm() {
    if (!task || ['completing', 'releasing', 'syncing'].includes(status)) return

    let taskCompleted = task.status === 'completed'
    setError('')

    try {
      if (!['in_progress', 'completed'].includes(task.status)) {
        throw new Error('La tarea aún no puede cerrarse. Espera a que esté en curso o completada.')
      }

      if (task.status !== 'completed') {
        setStatus('completing')
        const updated = await withAbortableTimeout(
          (signal) => markTaskCompleted(task.id, { signal }),
          COMPLETE_TIMEOUT_MS,
          'No hemos podido confirmar el cierre a tiempo.',
        )
        setTask(updated)
        queryClient.setQueryData(['task', task.id], updated)
        taskCompleted = true
      }

      setStatus('releasing')
      const releaseResult = await withAbortableTimeout(
        (signal) => releaseTaskPayment(task.id, { signal }),
        RELEASE_TIMEOUT_MS,
        'La actualización del pago está tardando más de lo normal.',
      )
      setPaymentStatus(releaseResult?.payment_status || '')

      setStatus('syncing')
      await withTimeout(
        Promise.all([
          queryClient.invalidateQueries({ queryKey: ['task', task.id] }),
          queryClient.invalidateQueries({ queryKey: ['task-payment-status', task.id] }),
          queryClient.invalidateQueries({ queryKey: ['tasks'] }),
          queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
        ]),
        INVALIDATION_TIMEOUT_MS,
        'No hemos podido confirmar todos los cambios a tiempo.',
      )
      await refreshCompletionState()
      setStatus('done')
    } catch (err) {
      const refreshedState = await refreshCompletionState()
      const completionConfirmed =
        taskCompleted || ['completed', 'closed'].includes(refreshedState.task?.status)

      setStatus(completionConfirmed ? 'release_error' : 'error')
      setError(
        completionConfirmed
          ? 'La tarea se ha marcado como completada. El pago sigue actualizándose. Puedes volver al detalle o reintentar la actualización de forma segura.'
          : `${err.message || 'No hemos podido confirmar todos los cambios.'} Vuelve al detalle de la tarea o inténtalo de nuevo.`,
      )
    }
  }

  function handleBackToChat() {
    navigate(taskPath, {
      state: {
        openChat: true,
        returnTo,
      },
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
          <button className="primary-action" onClick={handleBackToChat}>
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
            {paymentStatus === 'released'
              ? 'Gracias por confirmar el trabajo. El pago figura como liberado y puedes valorar al helper.'
              : 'Gracias por confirmar el trabajo. La actualización del pago ya está en marcha y puedes valorar al helper.'}
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

  if (status === 'error') {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <p className="eyebrow">Cierre pendiente</p>
          <h1>No hemos podido confirmar todos los cambios</h1>
          <p className="muted">{error}</p>
          <div className="two-actions">
            <button className="secondary-action" onClick={() => navigate(returnTo)}>
              Volver al detalle
            </button>
            <button className="primary-action" onClick={handleConfirm}>
              Reintentar cierre
            </button>
          </div>
        </section>
      </main>
    )
  }

  const actionPending = ['completing', 'releasing', 'syncing'].includes(status)
  const overlayCopy = status === 'releasing'
    ? {
        title: 'Actualizando el pago...',
        message: 'La tarea ya está completada. Estamos iniciando la actualización segura del pago.',
      }
    : status === 'syncing'
      ? {
          title: 'Confirmando los cambios...',
          message: 'Estamos refrescando el estado final de la tarea y del pago.',
        }
      : {
          title: 'Cerrando tarea...',
          message: 'Estamos guardando que el trabajo ha terminado.',
        }

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
          <button className="secondary-action" onClick={handleBackToChat} disabled={actionPending}>
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
        title={overlayCopy.title}
        message={overlayCopy.message}
      />
    </main>
  )
}
