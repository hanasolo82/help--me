import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTransitionNavigate } from '../../shared/navigation/usePageTransition'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import {
  applyToTask,
  getTaskApplications,
  rejectAssignedHelper,
  rejectTaskApplication,
  respondToDirectTask,
  selectTaskHelper,
  withdrawTaskApplication,
} from '../../services/tasksService'
import { reverseGeocodeLocation } from '../../services/locationService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import { getTaskReviewForUser } from '../../features/reviews/api/reviewsApi'
import ApplicationAvailabilityFields from '../../features/tasks/availability/ApplicationAvailabilityFields'
import {
  formatApplicationAvailability,
  formatTaskAvailabilityFull,
  isTaskTimeWindowExpired,
} from '../../features/tasks/availability/taskAvailability'
import { getTaskUrgency } from '../../features/tasks/urgency/taskUrgency'
import ActivityBadge from '../../features/tasks/categories/ActivityBadge'
import { getTaskStatusHint, getTaskStatusLabel, STATUS_HINT_PHRASES } from '../../features/tasks/utils/taskStatusLabels'
import TaskChatModal from '../../components/task/TaskChatModal'
import UserAvatar from '../../shared/ui/UserAvatar'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import { resolveReturnTo } from '../../shared/utils/navigation'
import TaskComplete from '../TaskComplete/TaskComplete'
import TaskReviewPromptModal from './TaskReviewPromptModal'

// Eyebrow que identifica quién eres tú en esta tarea (rol + propiedad).
function getRoleEyebrow({ isOwner, isHelper, canApply, creatorName }) {
  if (isOwner) return 'Tú pediste esta ayuda'
  if (isHelper) return `Estás ayudando a ${creatorName}`
  if (canApply) return 'Puedes ofrecerte para ayudar'
  return 'Detalle de tarea'
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

function renderStatusHint(hint, status) {
  if (!hint) return null

  const actionCopy = STATUS_HINT_PHRASES.action
  const actionIndex = hint.indexOf(actionCopy)

  if (actionIndex >= 0) {
    return (
      <>
        {hint.slice(0, actionIndex)}
        <span className="task-status-action">{actionCopy}</span>
        {hint.slice(actionIndex + actionCopy.length)}
      </>
    )
  }

  const positiveCopy = status === 'in_progress'
    ? STATUS_HINT_PHRASES.inProgress
    : status === 'completed'
      ? STATUS_HINT_PHRASES.completed
      : ''
  const positiveIndex = positiveCopy ? hint.indexOf(positiveCopy) : -1

  if (positiveIndex < 0) return hint

  return (
    <>
      {hint.slice(0, positiveIndex)}
      <span className="task-status-positive">{positiveCopy}</span>
      {hint.slice(positiveIndex + positiveCopy.length)}
    </>
  )
}

// Detalle de tarea conectado a Supabase. Centraliza oferta, decision, pago y chat.
export default function TaskDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const transitionNavigate = useTransitionNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { task, loading, error } = useTaskById(id)
  const taskPath = `/task/${id}`
  const returnTo = resolveReturnTo(location.state?.returnTo, '/home')
  const [chatOpen, setChatOpen] = useState(() => Boolean(location.state?.openChat))
  const [completionOpen, setCompletionOpen] = useState(false)
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false)
  const [taskLocationLabel, setTaskLocationLabel] = useState('')
  const [taskLocationStatus, setTaskLocationStatus] = useState('idle')
  const [offerAvailability, setOfferAvailability] = useState({
    availabilityResponse: 'matches',
    proposedDate: '',
    proposedTimeSlot: 'flexible',
    proposedTimeNote: '',
    message: '',
  })

  const applyMutation = useMutation({
    mutationFn: () => applyToTask(id, offerAvailability),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-applications', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
    },
  })

  const withdrawApplicationMutation = useMutation({
    mutationFn: (applicationId) => withdrawTaskApplication(applicationId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['task-applications', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
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

  const directResponseMutation = useMutation({
    mutationFn: (response) => respondToDirectTask(id, response),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
      ])
    },
  })

  const creatorProfile = task?.creator_profile || {}
  const helperProfile = task?.accepted_profile || {}
  const creatorName = creatorProfile.display_name || creatorProfile.full_name || creatorProfile.username || 'Vecino'
  const helperName = helperProfile.display_name || helperProfile.full_name || helperProfile.username || 'Ayudante'
  const priceEuros = Number(task?.price ?? 0)
  const taskUrgency = getTaskUrgency(task)
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
  const isDirectTask = task?.is_direct_request === true
  const isDirectTarget = isDirectTask && user?.id === task?.target_helper_id
  const isTaskExpired = isTaskTimeWindowExpired(task)
  const canApply = Boolean(task) && !isDirectTask && !isTaskExpired && !isOwner && task.status === 'open' && !task.accepted_by
  const canOpenPayment = Boolean(task) && isOwner && task.status === 'assigned' && Boolean(task.accepted_by)
  const canCloseTask = Boolean(task) && isOwner && Boolean(task.accepted_by) && task.status === 'in_progress'
  const canReviewHelper = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['completed', 'closed'].includes(task.status)
  const showDecisionGate = Boolean(task) && isOwner && task.status === 'assigned'
  const canOpenChat =
    Boolean(task) &&
    ['in_progress', 'completed', 'closed'].includes(task.status) &&
    (isOwner || isHelper)

  const applicationsQuery = useQuery({
    queryKey: ['task-applications', id],
    queryFn: () => getTaskApplications(id),
    enabled: Boolean(task) && !isDirectTask && ['open', 'assigned'].includes(task.status) && ((isOwner && !isTaskExpired) || canApply),
    staleTime: 15_000,
  })

  const taskApplications = applicationsQuery.data || []
  const pendingApplications = taskApplications.filter((application) => application.status === 'pending')
  const currentUserApplication = taskApplications.find((application) => application.helper_id === user?.id) || null
  const showApplicationsGate = Boolean(task) && !isDirectTask && !isTaskExpired && isOwner && task.status === 'open'
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

  const helperReviewQuery = useQuery({
    queryKey: ['task-review-status', id, task?.accepted_by || null],
    queryFn: () => getTaskReviewForUser(id, task.accepted_by),
    enabled:
      Boolean(task?.accepted_by) &&
      Boolean(isOwner || isHelper) &&
      ['completed', 'closed'].includes(task.status),
    staleTime: 30_000,
  })

  const roleEyebrow = getRoleEyebrow({ isOwner, isHelper, canApply, creatorName })
  const viewerRole = isOwner ? 'requester' : isHelper ? 'helper' : 'viewer'
  const humanTaskStatus = isDirectTask && task?.direct_request_response === 'declined'
    ? 'Solicitud no aceptada'
    : isDirectTask && task?.status === 'open'
    ? 'Solicitud directa'
    : isTaskExpired && task?.status === 'open'
    ? 'Plazo finalizado'
    : getTaskStatusLabel(task?.status)
  const taskStatusHint = isDirectTask && task?.direct_request_response === 'declined'
    ? 'El helper invitado no ha podido aceptar esta solicitud. Puedes publicar otra o elegir otra persona.'
    : isDirectTask && task?.status === 'open'
    ? isOwner
      ? 'La solicitud solo está visible para el helper que elegiste.'
      : 'Esta solicitud es exclusiva para ti. Decide si te encaja antes de que termine el plazo.'
    : isTaskExpired && task?.status === 'open'
    ? 'Ya no aparece en el tablón ni acepta nuevas ofertas. Puedes reprogramarla o retirarla.'
    : getTaskStatusHint({
      status: task?.status,
      viewerRole,
      applicationCount: pendingApplications.length,
      helperName,
      hasReview: Boolean(helperReviewQuery.data),
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
        : helperReviewQuery.error
          ? 'No disponible'
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
  const contextualProfile = isOwner && task?.accepted_by ? helperProfile : creatorProfile
  const contextualName = isOwner && task?.accepted_by ? helperName : creatorName
  const contextualRole = isOwner
    ? task?.accepted_by
      ? 'Helper'
      : 'Requester · Tú'
    : 'Requester'

  function handleOfferToggle() {
    if (applyMutation.isPending || withdrawApplicationMutation.isPending) return

    if (currentUserApplication?.status === 'pending') {
      withdrawApplicationMutation.mutate(currentUserApplication.id)
      return
    }

    if (!currentUserApplication) {
      applyMutation.mutate()
    }
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

  function handleDirectResponse(response) {
    if (directResponseMutation.isPending) return

    directResponseMutation.mutate(response)
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
          <button className="icon-button" onClick={() => transitionNavigate(returnTo, { direction: 'back' })} aria-label="Volver">
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
        <button className="icon-button" onClick={() => transitionNavigate(returnTo, { direction: 'back' })} aria-label="Volver">
          ←
        </button>
        <div className="task-header-copy">
          <p className="eyebrow">{roleEyebrow}</p>
          {/* Pareja del morph: el h2 de TaskCard se transforma en este h1 al navegar. */}
          <h1 style={{ viewTransitionName: 'task-title' }}>{task.title}</h1>
          <div className="task-header-person">
            <UserAvatar
              src={contextualProfile.avatar_url}
              name={contextualName}
              alt={contextualName}
              size="sm"
            />
            <div>
              <span>{contextualRole}</span>
              <strong>{contextualName}</strong>
            </div>
          </div>
          <p className="task-header-status">{humanTaskStatus}</p>
          {taskStatusHint ? <p className="task-header-turn">{renderStatusHint(taskStatusHint, task.status)}</p> : null}
        </div>
      </header>

      <section className="detail-panel task-overview-panel" aria-label="Resumen de la tarea">
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
            <strong>
              <ActivityBadge category={task.category} />
            </strong>
          </div>
          <div className="task-fact">
            <span>Cuándo</span>
            <strong>{formatTaskAvailabilityFull(task)}</strong>
          </div>
          {taskUrgency ? (
            <div className="task-fact">
              <span>Prioridad de plazo</span>
              <strong>{taskUrgency.label} · {taskUrgency.detail}</strong>
            </div>
          ) : null}
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

      {isTaskExpired && task.status === 'open' ? (
        <p className="auth-message" role="status">
          El plazo de esta solicitud ha finalizado. Reprograma el horario antes de volver a publicarla.
        </p>
      ) : null}

      {isDirectTask && task.status === 'open' && !isTaskExpired ? (
        <section className="detail-panel decision-gate">
          {isOwner ? (
            <>
              <p className="eyebrow">Solicitud enviada</p>
              <h2>Esperando la respuesta del helper invitado</h2>
              <p className="muted">Esta solicitud no aparece en el tablón ni admite ofertas de otras personas.</p>
            </>
          ) : isDirectTarget ? (
            <>
              <p className="eyebrow">Solicitud exclusiva</p>
              <h2>{creatorName} te ha pedido ayuda directamente</h2>
              <p className="muted">Si aceptas, el requester podrá confirmar y pagar. Si no te encaja, puedes rechazarla sin abrir un chat.</p>
              <div className="two-actions decision-actions">
                <button
                  type="button"
                  className="primary-action sticky-action"
                  onClick={() => handleDirectResponse('accept')}
                  disabled={directResponseMutation.isPending}
                >
                  {directResponseMutation.isPending ? 'Guardando...' : 'Aceptar solicitud'}
                </button>
                <button
                  type="button"
                  className="secondary-action sticky-action"
                  onClick={() => handleDirectResponse('decline')}
                  disabled={directResponseMutation.isPending}
                >
                  Rechazar
                </button>
              </div>
              {directResponseMutation.error ? (
                <p className="auth-message error" role="alert">
                  {directResponseMutation.error.message || 'No se pudo responder a la solicitud.'}
                </p>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {showDecisionGate ? (
        <section className="detail-panel decision-gate">
          <p className="eyebrow">Oferta pendiente</p>
          <h2>{helperName} te ayudará con esta tarea</h2>
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
          {applicationsQuery.isLoading ? (
            <p>Estamos comprobando las personas interesadas.</p>
          ) : pendingApplications.length > 0 ? (
            <p>Después de elegir un perfil, podrás confirmar la tarea y pagar.</p>
          ) : null}

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
                const applicationAvailability = formatApplicationAvailability(application, task)

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
                        {applicationAvailability ? <p className="muted">{applicationAvailability}</p> : null}
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

      {(error ||
        applyMutation.error ||
        withdrawApplicationMutation.error ||
        selectHelperMutation.error ||
        rejectApplicationMutation.error ||
        rejectHelperMutation.error) && (
        <p className="auth-message error">
          {error ||
            applyMutation.error?.message ||
            withdrawApplicationMutation.error?.message ||
            selectHelperMutation.error?.message ||
            rejectApplicationMutation.error?.message ||
            rejectHelperMutation.error?.message ||
            'Ha ocurrido un error.'}
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
        <>
          {canApply && !currentUserApplication ? (
            <ApplicationAvailabilityFields
              task={task}
              availabilityResponse={offerAvailability.availabilityResponse}
              proposedDate={offerAvailability.proposedDate}
              proposedTimeSlot={offerAvailability.proposedTimeSlot || task.requested_time_slot || 'flexible'}
              proposedTimeNote={offerAvailability.proposedTimeNote}
              message={offerAvailability.message}
              onChange={setOfferAvailability}
            />
          ) : null}

          {canApply && currentUserApplication?.status === 'pending' ? (
            <p className="muted">
              {formatApplicationAvailability(currentUserApplication, task) || 'Tu oferta está enviada.'}
            </p>
          ) : null}

          <div className="two-actions">
            {canApply && (
              <button
                type="button"
                className="primary-action sticky-action"
                onClick={handleOfferToggle}
                disabled={applyMutation.isPending || withdrawApplicationMutation.isPending}
                aria-busy={applyMutation.isPending || withdrawApplicationMutation.isPending}
              >
                {applyMutation.isPending
                  ? 'Enviando...'
                  : withdrawApplicationMutation.isPending
                    ? 'Retirando...'
                    : currentUserApplication?.status === 'pending'
                      ? 'Retirar oferta'
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
                onClick={() => setCompletionOpen(true)}
              >
                Confirmar finalización
              </button>
            )}

            {canReviewHelper && (
              helperReviewQuery.isLoading ? (
                <span className="muted" role="status">Comprobando valoración...</span>
              ) : !helperReviewQuery.data && !helperReviewQuery.error ? (
                <button
                  type="button"
                  className="primary-action sticky-action"
                  onClick={() => navigate(`/task/${id}/review`, { state: { returnTo: taskPath } })}
                >
                  Valorar helper
                </button>
              ) : null
            )}
          </div>
        </>
      )}

      {isOwner && task.status === 'draft' && (
        <p className="muted">Puedes publicarla desde “Tareas solicitadas” cuando quieras.</p>
      )}

      {isOwner && task.status === 'cancelled' && (
        <p className="muted">Ya no aparece entre las solicitudes activas.</p>
      )}

      <TaskChatModal
        open={chatOpen && canOpenChat}
        task={task}
        onClose={() => setChatOpen(false)}
      />
      <TaskComplete
        embedded
        open={completionOpen}
        taskId={id}
        initialTask={task}
        onClose={() => setCompletionOpen(false)}
        onCompleted={() => {
          setCompletionOpen(false)
          setReviewPromptOpen(true)
        }}
      />
      {reviewPromptOpen ? <TaskReviewPromptModal task={task} /> : null}
      <ActionStatusOverlay
        open={Boolean(actionStatus)}
        title={actionStatus?.title}
        message={actionStatus?.message}
      />
    </main>
  )
}
