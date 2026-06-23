import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { getTaskById, markTaskCompleted } from '../../services/tasksService'
import { getPaymentForTask, releaseTaskPayment } from '../../services/paymentsService'
import { getTaskReviewForUser } from '../../features/reviews/api/reviewsApi'
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
export default function TaskComplete({
  embedded = false,
  open = true,
  taskId: embeddedTaskId = null,
  initialTask = null,
  onClose = null,
  onCompleted = null,
}) {
  const { id: routeTaskId } = useParams()
  const taskId = embeddedTaskId || routeTaskId
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const taskPath = `/task/${taskId}`
  const returnTo = resolveReturnTo(location.state?.returnTo, taskPath)
  const [task, setTask] = useState(initialTask)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [, setPaymentStatus] = useState('')
  const helperReviewQuery = useQuery({
    queryKey: ['task-review-status', taskId, task?.accepted_by || null],
    queryFn: () => getTaskReviewForUser(taskId, task.accepted_by),
    enabled:
      open &&
      Boolean(task?.accepted_by) &&
      ['completed', 'closed'].includes(task?.status),
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!open || !taskId) return undefined

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
  }, [open, taskId])

  function renderSurface(content) {
    if (!embedded) {
      return (
        <main className="app-screen center-screen">
          <section className="completion-panel">{content}</section>
        </main>
      )
    }

    if (!open || typeof document === 'undefined') {
      return null
    }

    return createPortal(
      <div className="task-flow-modal-backdrop">
        <section
          className="completion-panel task-flow-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-completion-title"
        >
          {content}
        </section>
      </div>,
      document.body,
    )
  }

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
        Promise.allSettled([
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
      onCompleted?.()
    } catch (err) {
      const refreshedState = await refreshCompletionState()
      const completionConfirmed =
        taskCompleted || ['completed', 'closed'].includes(refreshedState.task?.status)

      setStatus(completionConfirmed ? 'release_error' : 'error')
      setError(
        completionConfirmed
          ? 'La tarea se ha marcado como completada, pero no hemos podido confirmar todos los cambios. Puedes volver al detalle o reintentar la confirmación.'
          : `${err.message || 'No hemos podido confirmar todos los cambios.'} Vuelve al detalle de la tarea o inténtalo de nuevo.`,
      )
    }
  }

  function handleReturn() {
    if (embedded) {
      onClose?.()
      return
    }

    navigate(returnTo)
  }

  function handleBackToChat() {
    if (embedded) {
      onClose?.()
      return
    }

    navigate(taskPath, {
      state: {
        openChat: true,
        returnTo,
      },
    })
  }

  if (!task && !error) {
    return renderSurface(<p className="muted">Cargando tarea...</p>)
  }

  if (!task) {
    return renderSurface(
      <>
        <p className="auth-message error">{error}</p>
        <button type="button" className="secondary-action" onClick={handleReturn}>
          Volver
        </button>
      </>,
    )
  }

  const isRequester = user?.id === task.created_by

  if (!isRequester) {
    return renderSurface(
      <>
        <h1 id="task-completion-title">Solo el solicitante puede cerrar la tarea</h1>
        <p className="muted">Espera a que la otra persona confirme el cierre.</p>
        <button className="primary-action" onClick={handleBackToChat}>
          Volver al detalle
        </button>
      </>,
    )
  }

  if (!['in_progress', 'completed'].includes(task.status)) {
    return renderSurface(
      <>
        <h1 id="task-completion-title">La tarea aún no se puede cerrar</h1>
        <p className="muted">
          El cierre solo está disponible cuando la tarea ya está en curso.
        </p>
        <button className="secondary-action" onClick={handleReturn}>
          Volver al detalle
        </button>
      </>,
    )
  }

  if (status === 'done') {
    return renderSurface(
      <>
        <p className="eyebrow">Cierre confirmado</p>
        <h1 id="task-completion-title">La tarea está completada</h1>
        <p className="muted">Gracias por confirmar que la ayuda ha terminado.</p>
        {!embedded ? (
          <div className="two-actions">
            <button className="secondary-action" onClick={handleReturn}>
              Volver al detalle
            </button>
            {task.accepted_by && helperReviewQuery.isLoading ? (
              <span className="muted" role="status">Comprobando valoración...</span>
            ) : task.accepted_by && helperReviewQuery.data ? (
              <span className="muted">Valoración publicada</span>
            ) : task.accepted_by && !helperReviewQuery.error ? (
              <button
                className="primary-action"
                onClick={() => navigate(`/task/${task.id}/review`, { state: { returnTo: taskPath } })}
              >
                Valorar helper
              </button>
            ) : null}
          </div>
        ) : null}
      </>,
    )
  }

  if (status === 'release_error') {
    return renderSurface(
      <>
        <p className="eyebrow">Confirmación pendiente</p>
        <h1 id="task-completion-title">La tarea ya está completada</h1>
        <p className="muted">{error}</p>
        <div className="two-actions">
          <button className="secondary-action" onClick={handleReturn}>
            Volver al detalle
          </button>
          <button className="primary-action" onClick={handleConfirm}>
            Reintentar confirmación
          </button>
        </div>
      </>,
    )
  }

  if (status === 'error') {
    return renderSurface(
      <>
        <p className="eyebrow">Cierre pendiente</p>
        <h1 id="task-completion-title">No hemos podido confirmar todos los cambios</h1>
        <p className="muted">{error}</p>
        <div className="two-actions">
          <button className="secondary-action" onClick={handleReturn}>
            Volver al detalle
          </button>
          <button className="primary-action" onClick={handleConfirm}>
            Reintentar cierre
          </button>
        </div>
      </>,
    )
  }

  const actionPending = ['completing', 'releasing', 'syncing'].includes(status)
  const overlayCopy = status === 'releasing'
    ? {
        title: 'Confirmando el cierre...',
        message: 'La tarea ya está completada. Estamos terminando la confirmación de forma segura.',
      }
    : status === 'syncing'
      ? {
          title: 'Confirmando los cambios...',
          message: 'Estamos comprobando el estado final de la tarea.',
        }
      : {
          title: 'Cerrando tarea...',
          message: 'Estamos guardando que el trabajo ha terminado.',
        }

  const confirmationContent = (
    <>
        <p className="eyebrow">Tarea</p>
        <h1 id="task-completion-title">¿Quieres cerrar esta tarea?</h1>
        <p className="muted">
          Confirma solo cuando la ayuda se haya completado. Después podrás valorar al helper.
        </p>

        <div className="two-actions">
          <button className="secondary-action" onClick={handleReturn} disabled={actionPending}>
            Volver
          </button>
          <button className="success-action" onClick={handleConfirm} disabled={actionPending}>
            {actionPending ? 'Cerrando...' : 'Cerrar tarea'}
          </button>
        </div>

        {error && <p className="auth-message error">{error}</p>}
    </>
  )

  return (
    <>
      {renderSurface(confirmationContent)}
      <ActionStatusOverlay
        open={actionPending}
        title={overlayCopy.title}
        message={overlayCopy.message}
      />
    </>
  )
}
