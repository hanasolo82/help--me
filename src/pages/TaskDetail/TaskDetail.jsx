import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { acceptTask, rejectAssignedHelper } from '../../services/tasksService'
import { reverseGeocodeLocation } from '../../services/locationService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import { getMyReviewForTask } from '../../features/reviews/api/reviewsApi'
import TaskChatModal from '../../components/task/TaskChatModal'
import messageIcon from '../../assets/icons/message.svg'

const TASK_STATUS_LABELS = {
  draft: 'Borrador',
  open: 'Activa',
  assigned: 'Oferta pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
}

function formatTaskStatus(status) {
  return TASK_STATUS_LABELS[status] || status || 'No disponible'
}

// Detalle de tarea conectado a Supabase. Permite aceptarla o abrir chat con el creador.
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { task, loading, error } = useTaskById(id)
  const [chatOpen, setChatOpen] = useState(() => Boolean(location.state?.openChat))
  const [taskLocationLabel, setTaskLocationLabel] = useState('')
  const [taskLocationStatus, setTaskLocationStatus] = useState('idle')

  const acceptMutation = useMutation({
    mutationFn: () => acceptTask(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id ?? null] }),
      ])
      navigate(`/task/${id}`, {
        replace: true,
        state: { acceptedTask: true },
      })
    },
  })

  const rejectHelperMutation = useMutation({
    mutationFn: () => rejectAssignedHelper(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id ?? null] }),
      ])
      navigate('/home', {
        replace: true,
        state: { mode: 'need' },
      })
    },
  })

  const creatorProfile = task?.creator_profile || {}
  const helperProfile = task?.accepted_profile || {}
  const creatorName = creatorProfile.display_name || creatorProfile.full_name || creatorProfile.username || 'Vecino'
  const helperName = helperProfile.display_name || helperProfile.full_name || helperProfile.username || 'Ayudante'
  const creatorInitial = getAvatarInitial(creatorName)
  const helperInitial = getAvatarInitial(helperName)
  const priceEuros = Number(task?.price ?? 0)
  const hasCoordinates = Number.isFinite(Number(task?.lat)) && Number.isFinite(Number(task?.lng))

  useEffect(() => {
    let cancelled = false

    async function resolveLocationLabel() {
      if (!hasCoordinates) {
        setTaskLocationLabel('')
        setTaskLocationStatus('idle')
        return
      }

      setTaskLocationStatus('loading')

      try {
        const result = await reverseGeocodeLocation(task.lat, task.lng)
        if (cancelled) return

        setTaskLocationLabel(result?.label || '')
        setTaskLocationStatus('success')
      } catch {
        if (cancelled) return

        setTaskLocationLabel('')
        setTaskLocationStatus('error')
      }
    }

    resolveLocationLabel()

    return () => {
      cancelled = true
    }
  }, [hasCoordinates, task?.lat, task?.lng])

  const isOwner = user?.id === task?.created_by
  const isHelper = user?.id === task?.accepted_by
  const canAccept = Boolean(task) && !isOwner && task.status === 'open' && !task.accepted_by
  const canOpenPayment = Boolean(task) && isOwner && task.status === 'assigned' && Boolean(task.accepted_by)
  const canCloseTask = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['in_progress', 'completed'].includes(task.status)
  const canReviewHelper = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['completed', 'closed'].includes(task.status)
  const showDecisionGate = isOwner && task.status === 'assigned'
  const canOpenChat =
    Boolean(task) &&
    ((task.status === 'open' && !isOwner) ||
      (['in_progress', 'completed', 'closed'].includes(task.status) && (isOwner || isHelper)))

  const helperReviewQuery = useQuery({
    queryKey: ['task-review', id, task?.accepted_by || null],
    queryFn: () => getMyReviewForTask(id, task.accepted_by),
    enabled: canReviewHelper,
    staleTime: 30_000,
  })

  async function handleAccept() {
    acceptMutation.mutate()
  }

  function handleRejectHelper() {
    const shouldReject = window.confirm(
      `¿Quieres rechazar a ${helperName}?\n\nLa solicitud volverá a estar disponible para otros helpers.`,
    )

    if (!shouldReject) {
      return
    }

    rejectHelperMutation.mutate()
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
        <p className="auth-message error">{error || 'Tarea no encontrada o ya no esta disponible.'}</p>
      </main>
    )
  }

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

      {showDecisionGate ? (
        <section className="detail-panel">
          <p className="eyebrow">Oferta pendiente</p>
          <h2>{helperName} ha aceptado tu tarea</h2>
          <p>Confirma la tarea para pagar y abrir el chat privado.</p>

          <div className="detail-row">
            <span>Tarea</span>
            <strong>{task.title}</strong>
          </div>
          <p className="muted">{task.description}</p>
          <div className="detail-row">
            <span>Precio</span>
            <strong>{priceEuros} EUR</strong>
          </div>

          {task.accepted_profile && (
            <div className="user-strip">
              <span className="avatar-small">
                {helperProfile.avatar_url ? <img src={helperProfile.avatar_url} alt={helperName} /> : helperInitial}
              </span>
              <div>
                <strong>{helperName}</strong>
                <p>{helperProfile.rating ? `${helperProfile.rating}/5` : 'Listo para ayudarte'}</p>
                {helperProfile.verified && <p>Perfil verificado</p>}
              </div>
            </div>
          )}

          <div className="two-actions">
            {canOpenPayment && (
              <>
                <button
                  type="button"
                  className="primary-action sticky-action"
                  onClick={() => navigate(`/task/${id}/payment`)}
                >
                  Confirmar y pagar
                </button>
                <button
                  type="button"
                  className="secondary-action sticky-action"
                  onClick={handleRejectHelper}
                  disabled={rejectHelperMutation.isPending}
                >
                  {rejectHelperMutation.isPending ? 'Rechazando...' : 'Rechazar helper'}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="secondary-action sticky-action"
            onClick={() => navigate(`/profile/${task.accepted_by}`)}
          >
            Ver perfil
          </button>
        </section>
      ) : (
        <>
          <section className="detail-panel">
            <div className="user-strip">
              <span className="avatar-small">
                {creatorProfile.avatar_url ? <img src={creatorProfile.avatar_url} alt={creatorName} /> : creatorInitial}
              </span>
              <div>
                <strong>{creatorName}</strong>
                <p>{creatorProfile.rating ? `${creatorProfile.rating}/5` : 'Vecino de confianza'}</p>
                {creatorProfile.verified && <p>Perfil verificado</p>}
              </div>
            </div>

            {task.accepted_profile && (
              <div className="user-strip">
                <span className="avatar-small">
                  {helperProfile.avatar_url ? <img src={helperProfile.avatar_url} alt={helperName} /> : helperInitial}
                </span>
                <div>
                  <strong>{helperName}</strong>
                  <p>{helperProfile.rating ? `${helperProfile.rating}/5` : 'Ayudante asignado'}</p>
                  {helperProfile.verified && <p>Perfil verificado</p>}
                </div>
              </div>
            )}

            <div className="detail-row">
              <span>Ubicacion</span>
              <strong>
                {taskLocationStatus === 'loading'
                  ? 'Buscando direccion...'
                  : taskLocationLabel || 'Direccion privada'}
              </strong>
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
              <strong>{formatTaskStatus(task.status)}</strong>
            </div>
          </section>

          <section className="detail-panel">
            <h2>Descripcion</h2>
            <p>{task.description}</p>
          </section>
        </>
      )}

      {(error || acceptMutation.error || rejectHelperMutation.error) && (
        <p className="auth-message error">
          {error || acceptMutation.error?.message || rejectHelperMutation.error?.message || 'Ha ocurrido un error.'}
        </p>
      )}

      {location.state?.acceptedTask && isHelper && task.status === 'assigned' && (
        <p className="auth-message">
          Tarea aceptada. Esperando a que el requester confirme la ayuda.
        </p>
      )}

      {location.state?.reviewSaved && (
        <p className="auth-message">
          Valoración publicada. Ya aparece en el perfil del helper.
        </p>
      )}

      {!showDecisionGate && (
        <div className="two-actions">
          {canOpenChat && (
            <button
              type="button"
              className="icon-button message-action"
              onClick={() => setChatOpen(true)}
              aria-label="Abrir chat"
              title="Abrir chat"
            >
              <img src={messageIcon} alt="" aria-hidden="true" />
            </button>
          )}

          {canAccept && (
            <button
              type="button"
              className="primary-action sticky-action"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? 'Aceptando...' : 'Aceptar tarea'}
            </button>
          )}

          {canOpenPayment && (
            <>
              <button
                type="button"
                className="primary-action sticky-action"
                onClick={() => navigate(`/task/${id}/payment`)}
              >
                Confirmar y pagar
              </button>
              <button
                type="button"
                className="secondary-action sticky-action"
                onClick={handleRejectHelper}
                disabled={rejectHelperMutation.isPending}
              >
                {rejectHelperMutation.isPending ? 'Rechazando...' : 'Rechazar helper'}
              </button>
            </>
          )}

          {canCloseTask && (
            <button
              type="button"
              className="secondary-action sticky-action"
              onClick={() => navigate(`/complete/${id}`)}
            >
              Confirmar finalización
            </button>
          )}

          {canReviewHelper && (
            helperReviewQuery.data ? (
              <button type="button" className="secondary-action sticky-action" disabled>
                Valorada
              </button>
            ) : (
              <button
                type="button"
                className="primary-action sticky-action"
                onClick={() => navigate(`/task/${id}/review`)}
              >
                Valorar helper
              </button>
            )
          )}
        </div>
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

      {isOwner && task.status === 'closed' && (
        <p className="muted">La ayuda ya se cerró y los fondos quedaron liberados.</p>
      )}

      <TaskChatModal
        open={chatOpen}
        task={task}
        onClose={() => setChatOpen(false)}
      />
    </main>
  )
}
