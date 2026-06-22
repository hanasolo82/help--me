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
import { getPaymentForTask } from '../../services/paymentsService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import { getTaskReviewForUser } from '../../features/reviews/api/reviewsApi'
import TaskChatModal from '../../components/task/TaskChatModal'
import UserAvatar from '../../shared/ui/UserAvatar'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import { resolveReturnTo } from '../../shared/utils/navigation'

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
  return TASK_STATUS_LABELS[status] || 'Estado no disponible'
}

function getHumanTaskStatus({ taskStatus, paymentStatus, isOwner, isHelper, helperReviewPublished }) {
  if (taskStatus === 'in_progress') return 'Tarea en curso'

  if (taskStatus === 'completed') {
    if (isHelper) {
      return 'Trabajo completado · ingreso en proceso'
    }

    if (['held', 'release_pending', 'transferring'].includes(paymentStatus)) {
      return 'Tarea completada · pago en actualización'
    }

    if (isOwner && !helperReviewPublished) {
      return 'Tarea completada · valoración pendiente'
    }

    return 'Tarea completada'
  }

  if (taskStatus === 'closed') {
    return isHelper
      ? 'Tarea cerrada · ingreso confirmado'
      : 'Tarea cerrada · pago liberado'
  }

  return formatTaskStatus(taskStatus)
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
  const taskPath = `/task/${id}`
  const returnTo = resolveReturnTo(location.state?.returnTo, '/home')
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
      navigate(taskPath, {
        replace: true,
        state: { helperRejected: true, returnTo },
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
  const actionStatus = selectHelperMutation.isPending
    ? {
        title: 'Asignando helper...',
        message: 'Estamos preparando la oferta pendiente para que puedas confirmar y pagar.',
      }
    : rejectHelperMutation.isPending || rejectApplicationMutation.isPending
      ? {
          title: 'Actualizando la tarea...',
          message: 'Estamos guardando tu decisión y actualizando los helpers interesados.',
        }
      : null

  const paymentQuery = useQuery({
    queryKey: ['task-payment-status', id],
    queryFn: () => getPaymentForTask(id),
    enabled:
      Boolean(task) &&
      Boolean(isOwner || isHelper) &&
      ['in_progress', 'completed', 'closed'].includes(task.status),
    staleTime: 10_000,
    retry: false,
  })

  const helperReviewQuery = useQuery({
    queryKey: ['task-review-status', id, task?.accepted_by || null],
    queryFn: () => getTaskReviewForUser(id, task.accepted_by),
    enabled:
      Boolean(task?.accepted_by) &&
      Boolean(isOwner || isHelper) &&
      ['completed', 'closed'].includes(task.status),
    staleTime: 30_000,
  })

  const humanTaskStatus = getHumanTaskStatus({
    taskStatus: task?.status,
    paymentStatus: paymentQuery.data?.status || '',
    isOwner,
    isHelper,
    helperReviewPublished: Boolean(helperReviewQuery.data),
  })
  const moneyLabel = isOwner
    ? 'Coste de la tarea'
    : isHelper
      ? 'Beneficio estimado'
      : 'Precio de la tarea'
  const helperReviewStatus = !task?.accepted_by
    ? 'Sin helper elegido'
    : !['completed', 'closed'].includes(task.status)
      ? 'Disponible al finalizar'
      : helperReviewQuery.isLoading
        ? 'Comprobando...'
        : helperReviewQuery.data
          ? 'Publicada'
          : 'Pendiente'
  const chatAvailabilityCopy = canOpenChat
    ? 'Habla con la otra persona sin salir del contexto de esta tarea.'
    : task?.status === 'assigned'
      ? 'El chat se desbloqueará cuando el pago esté confirmado.'
      : task?.status === 'open'
        ? 'El chat estará disponible cuando elijas helper y confirmes la tarea.'
        : 'El chat todavía no está disponible para esta tarea.'

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
          <button className="icon-button" onClick={() => navigate(returnTo)} aria-label="Volver">
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
        <button className="icon-button" onClick={() => navigate(returnTo)} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Detalle de tarea</p>
          <h1>{task.title}</h1>
          <p className="task-header-status">{humanTaskStatus}</p>
        </div>
      </header>

      <section className="detail-panel task-overview-panel" aria-label="Resumen de la tarea">
        <div className="task-people-grid">
          <article className="task-person-card">
            <UserAvatar
              src={creatorProfile.avatar_url}
              name={creatorName || creatorInitial}
              alt={creatorName}
              size="sm"
              className="avatar-small"
            />
            <div>
              <span>Requester</span>
              <strong>{creatorName}</strong>
              <p>Solicita y confirma la ayuda</p>
            </div>
          </article>

          <article className="task-person-card">
            {task.accepted_by ? (
              <UserAvatar
                src={helperProfile.avatar_url}
                name={helperName || helperInitial}
                alt={helperName}
                size="sm"
                className="avatar-small"
              />
            ) : (
              <span className="task-person-placeholder" aria-hidden="true">—</span>
            )}
            <div>
              <span>Helper</span>
              <strong>{task.accepted_by ? helperName : 'Sin helper elegido'}</strong>
              <p>{task.accepted_by ? 'Persona asignada a la tarea' : 'Pendiente de selección'}</p>
            </div>
          </article>
        </div>

        <div className="task-facts-grid">
          <div className="task-fact">
            <span>Ubicación de la tarea</span>
            <strong>
              {taskLocationStatus === 'loading'
                ? 'Buscando dirección...'
                : taskLocationLabel || task.location_label || 'Dirección privada'}
            </strong>
          </div>
          <div className="task-fact">
            <span>{moneyLabel}</span>
            <strong>{priceEuros} EUR</strong>
          </div>
          <div className="task-fact">
            <span>Categoría</span>
            <strong>{task.category}</strong>
          </div>
        </div>

        {task.accepted_by ? (
          <div className="task-review-grid">
            <div>
              <span>Valoración del helper</span>
              <strong>{helperReviewStatus}</strong>
            </div>
            <div>
              <span>Valoración del requester</span>
              <strong>No incluida en esta beta</strong>
            </div>
          </div>
        ) : null}
      </section>

      {showDecisionGate ? (
        <section className="detail-panel decision-gate">
          <p className="eyebrow">Oferta pendiente</p>
          <h2>{helperName} te ayudará con esta tarea</h2>
          <p>Confirma la tarea para pagar y abrir el chat privado.</p>

          <p className="muted">{task.description}</p>

          <div className="two-actions decision-actions">
            {canOpenPayment && (
              <>
                <button
                  type="button"
                  className="primary-action sticky-action"
                  onClick={() => navigate(`/task/${id}/payment`, { state: { returnTo: taskPath } })}
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
            onClick={() => navigate(`/profile/${task.accepted_by}`, { state: { returnTo: taskPath } })}
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
                        onClick={() => navigate(`/profile/${application.helper_id}`, { state: { returnTo: taskPath } })}
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
        <section className="detail-panel">
          <h2>Descripción</h2>
          <p>{task.description}</p>
        </section>
      )}

      {(isOwner || isHelper) ? (
        <section className="detail-panel task-chat-panel">
          <div>
            <p className="eyebrow">Mensajes</p>
            <h2>Chat de la tarea</h2>
            <p className="muted">{chatAvailabilityCopy}</p>
          </div>
          {canOpenChat ? (
            <button type="button" className="primary-action" onClick={() => setChatOpen(true)}>
              Abrir chat
            </button>
          ) : (
            <button type="button" className="secondary-action" disabled>
              Chat bloqueado
            </button>
          )}
        </section>
      ) : null}

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

      {location.state?.helperRejected && (
        <p className="auth-message">
          Helper rechazado. La tarea vuelve a estar disponible para nuevas personas interesadas.
        </p>
      )}

      {!showDecisionGate && (
        <div className="two-actions">
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
                onClick={() => navigate(`/task/${id}/payment`, { state: { returnTo: taskPath } })}
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
              onClick={() => navigate(`/complete/${id}`, { state: { returnTo: taskPath } })}
            >
              {task.status === 'completed' ? 'Actualizar estado del pago' : 'Confirmar finalización'}
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
                onClick={() => navigate(`/task/${id}/review`, { state: { returnTo: taskPath } })}
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
        open={chatOpen && canOpenChat}
        task={task}
        onClose={() => setChatOpen(false)}
      />
      <ActionStatusOverlay
        open={Boolean(actionStatus)}
        title={actionStatus?.title}
        message={actionStatus?.message}
      />
    </main>
  )
}
