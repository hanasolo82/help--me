import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import {
  applyToTask,
  getTaskApplications,
  rejectAssignedHelper,
  rejectTaskApplication,
  selectTaskHelper,
} from '../../services/tasksService'
import { reverseGeocodeLocation } from '../../services/locationService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import { getMyReviewForTask } from '../../features/reviews/api/reviewsApi'
import TaskChatModal from '../../components/task/TaskChatModal'
import UserAvatar from '../../shared/ui/UserAvatar'
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

function formatApplicationDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

// Detalle de tarea conectado a Supabase. Centraliza oferta, decision, pago y chat.
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

  const applyMutation = useMutation({
    mutationFn: () => applyToTask(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-applications', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      navigate(`/task/${id}`, {
        replace: true,
        state: { offeredTask: true },
      })
    },
  })

  const selectHelperMutation = useMutation({
    mutationFn: (applicationId) => selectTaskHelper(applicationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-applications', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
      ])
    },
  })

  const rejectApplicationMutation = useMutation({
    mutationFn: (applicationId) => rejectTaskApplication(applicationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-applications', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
      ])
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
  const canApply = Boolean(task) && !isOwner && task.status === 'open' && !task.accepted_by
  const canOpenPayment = Boolean(task) && isOwner && task.status === 'assigned' && Boolean(task.accepted_by)
  const canCloseTask = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['in_progress', 'completed'].includes(task.status)
  const canReviewHelper = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['completed', 'closed'].includes(task.status)
  const showDecisionGate = Boolean(task) && isOwner && task.status === 'assigned'
  const canOpenChat =
    Boolean(task) &&
    ['in_progress', 'completed', 'closed'].includes(task.status) &&
    (isOwner || isHelper)

  const applicationsQuery = useQuery({
    queryKey: ['task-applications', id],
    queryFn: () => getTaskApplications(id),
    enabled: Boolean(task) && ['open', 'assigned'].includes(task.status) && (isOwner || canApply),
    staleTime: 15_000,
  })

  const taskApplications = applicationsQuery.data || []
  const pendingApplications = taskApplications.filter((application) => application.status === 'pending')
  const currentUserApplication = taskApplications.find((application) => application.helper_id === user?.id) || null
  const showApplicationsGate = Boolean(task) && isOwner && task.status === 'open'

  const helperReviewQuery = useQuery({
    queryKey: ['task-review', id, task?.accepted_by || null],
    queryFn: () => getMyReviewForTask(id, task.accepted_by),
    enabled: canReviewHelper,
    staleTime: 30_000,
  })

  async function handleApply() {
    applyMutation.mutate()
  }

  function handleSelectApplication(application) {
    if (!application?.id) return

    selectHelperMutation.mutate(application.id)
  }

  function handleRejectApplication(application) {
    if (!application?.id) return

    const profile = application.helper_profile || {}
    const applicationHelperName = profile.display_name || profile.full_name || profile.username || 'este helper'
    const shouldReject = window.confirm(
      `¿Quieres rechazar a ${applicationHelperName}?\n\nLa candidatura dejará de aparecer en esta lista.`,
    )

    if (!shouldReject) {
      return
    }

    rejectApplicationMutation.mutate(application.id)
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
        <section className="detail-panel decision-gate">
          <p className="eyebrow">Oferta pendiente</p>
          <h2>{helperName} te ayudará con esta tarea</h2>
          <p>Confirma la tarea para pagar y abrir el chat privado.</p>

          <div className="detail-row decision-summary-row">
            <span>Tarea</span>
            <strong>{task.title}</strong>
          </div>
          <p className="muted">{task.description}</p>
          <div className="detail-row total-row">
            <span>Precio</span>
            <strong>{priceEuros} EUR</strong>
          </div>

          {task.accepted_profile && (
            <div className="user-strip helper-strip">
              <UserAvatar
                src={helperProfile.avatar_url}
                name={helperName || helperInitial}
                alt={helperName}
                size="sm"
                className="avatar-small"
              />
              <div>
                <strong>{helperName}</strong>
                <p>{helperProfile.rating ? `${helperProfile.rating}/5` : 'Listo para ayudarte'}</p>
                {helperProfile.verified && <p>Perfil verificado</p>}
              </div>
            </div>
          )}

          <div className="two-actions decision-actions">
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
            className="secondary-action profile-link-action"
            onClick={() => navigate(`/profile/${task.accepted_by}`)}
          >
            Ver perfil
          </button>
        </section>
      ) : showApplicationsGate ? (
        <section className="detail-panel applications-gate">
          <p className="eyebrow">Helpers interesados</p>
          <h2>
            {pendingApplications.length > 0
              ? pendingApplications.length === 1
                ? '1 persona se ha ofrecido para ayudarte'
                : `${pendingApplications.length} personas se han ofrecido para ayudarte`
              : 'Tu tarea está publicada'}
          </h2>
          <p>
            {applicationsQuery.isLoading
              ? 'Estamos comprobando si algún helper se ha ofrecido.'
              : pendingApplications.length > 0
                ? 'Revisa los perfiles y elige un helper. Después podrás confirmar y pagar.'
                : 'Aún no hay helpers interesados. Te avisaremos cuando alguien se ofrezca.'}
          </p>

          <div className="detail-row">
            <span>Tarea</span>
            <strong>{task.title}</strong>
          </div>
          <div className="detail-row">
            <span>Precio</span>
            <strong>{priceEuros} EUR</strong>
          </div>

          {applicationsQuery.error ? (
            <p className="auth-message error">
              {applicationsQuery.error.message || 'No pudimos cargar los helpers interesados.'}
            </p>
          ) : null}

          {pendingApplications.length > 0 ? (
            <div className="application-list">
              {pendingApplications.map((application, index) => {
                const applicationProfile = application.helper_profile || {}
                const applicationHelperName =
                  applicationProfile.display_name ||
                  applicationProfile.full_name ||
                  applicationProfile.username ||
                  'Helper interesado'
                const applicationInitial = getAvatarInitial(applicationHelperName)
                const applicationDate = formatApplicationDate(application.created_at)

                return (
                  <article className="application-card" key={application.id}>
                    <div className="user-strip">
                      <UserAvatar
                        src={applicationProfile.avatar_url}
                        name={applicationHelperName || applicationInitial}
                        alt={applicationHelperName}
                        size="sm"
                        className="avatar-small"
                      />
                      <div>
                        <p className="eyebrow">{index === 0 ? 'Primera en ofrecerse' : 'Helper interesado'}</p>
                        <strong>{applicationHelperName}</strong>
                        <p>
                          {applicationProfile.rating
                            ? `${applicationProfile.rating}/5`
                            : 'Disponible para ayudarte'}
                        </p>
                        {applicationDate ? <p className="muted">Se ofreció el {applicationDate}</p> : null}
                        {application.message ? <p className="muted">{application.message}</p> : null}
                      </div>
                    </div>

                    <div className="two-actions">
                      <button
                        type="button"
                        className="primary-action sticky-action"
                        onClick={() => handleSelectApplication(application)}
                        disabled={selectHelperMutation.isPending}
                      >
                        {selectHelperMutation.isPending ? 'Eligiendo...' : 'Elegir helper'}
                      </button>
                      <button
                        type="button"
                        className="secondary-action sticky-action"
                        onClick={() => navigate(`/profile/${application.helper_id}`)}
                      >
                        Ver perfil
                      </button>
                      <button
                        type="button"
                        className="secondary-action sticky-action"
                        onClick={() => handleRejectApplication(application)}
                        disabled={rejectApplicationMutation.isPending}
                      >
                        {rejectApplicationMutation.isPending ? 'Rechazando...' : 'Rechazar'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : (
        <>
          <section className="detail-panel">
            <div className="user-strip">
              <UserAvatar
                src={creatorProfile.avatar_url}
                name={creatorName || creatorInitial}
                alt={creatorName}
                size="sm"
                className="avatar-small"
              />
              <div>
                <strong>{creatorName}</strong>
                <p>{creatorProfile.rating ? `${creatorProfile.rating}/5` : 'Vecino de confianza'}</p>
                {creatorProfile.verified && <p>Perfil verificado</p>}
              </div>
            </div>

            {task.accepted_profile && (
              <div className="user-strip">
                <UserAvatar
                  src={helperProfile.avatar_url}
                  name={helperName || helperInitial}
                  alt={helperName}
                  size="sm"
                  className="avatar-small"
                />
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

      {(error || applyMutation.error || selectHelperMutation.error || rejectApplicationMutation.error || rejectHelperMutation.error) && (
        <p className="auth-message error">
          {error ||
            applyMutation.error?.message ||
            selectHelperMutation.error?.message ||
            rejectApplicationMutation.error?.message ||
            rejectHelperMutation.error?.message ||
            'Ha ocurrido un error.'}
        </p>
      )}

      {location.state?.offeredTask && !isOwner && task.status === 'open' && (
        <p className="auth-message">
          Te has ofrecido para esta tarea. El requester decidirá si te elige.
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

          {canApply && (
            <button
              type="button"
              className="primary-action sticky-action"
              onClick={handleApply}
              disabled={applyMutation.isPending || Boolean(currentUserApplication)}
            >
              {currentUserApplication
                ? 'Ya te ofreciste'
                : applyMutation.isPending
                  ? 'Enviando oferta...'
                  : 'Ofrecerme'}
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
        <p className="muted">
          {pendingApplications.length > 0
            ? 'Elige un helper interesado para continuar.'
            : 'Esta es tu tarea. Espera a que algún helper se ofrezca.'}
        </p>
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
