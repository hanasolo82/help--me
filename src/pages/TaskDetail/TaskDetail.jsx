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
  withdrawTaskApplication,
} from '../../services/tasksService'
import { reverseGeocodeLocation } from '../../services/locationService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import { getTaskReviewForUser } from '../../features/reviews/api/reviewsApi'
import TaskChatModal from '../../components/task/TaskChatModal'
import UserAvatar from '../../shared/ui/UserAvatar'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import { resolveReturnTo } from '../../shared/utils/navigation'
import TaskComplete from '../TaskComplete/TaskComplete'
import TaskReviewPromptModal from './TaskReviewPromptModal'

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

function getHumanTaskStatus({ taskStatus, isOwner, isHelper, helperReviewPublished }) {
  if (taskStatus === 'in_progress') return 'Tarea en curso'

  if (taskStatus === 'completed') {
    if (isHelper) {
      return 'Trabajo completado'
    }

    if (isOwner && !helperReviewPublished) {
      return 'Tarea completada · valoración pendiente'
    }

    return 'Tarea completada'
  }

  if (taskStatus === 'closed') {
    return isHelper
      ? 'Tarea cerrada · ingreso confirmado'
      : 'Tarea cerrada'
  }

  return formatTaskStatus(taskStatus)
}

// Eyebrow que identifica quién eres tú en esta tarea (rol + propiedad).
function getRoleEyebrow({ isOwner, isHelper, canApply, creatorName }) {
  if (isOwner) return 'Tú pediste esta ayuda'
  if (isHelper) return `Estás ayudando a ${creatorName}`
  if (canApply) return 'Puedes ofrecerte para ayudar'
  return 'Detalle de tarea'
}

// De quién depende la siguiente acción: 'you' (te toca), 'waiting' (en espera) o 'none'.
function getTurnContext({ status, isOwner, isHelper, canApply, alreadyApplied, hasPendingApplications, helperReviewPublished }) {
  if (isOwner) {
    if (status === 'draft') return { tone: 'none', detail: 'Esta tarea sigue en borrador.' }
    if (status === 'open') {
      return hasPendingApplications
        ? { tone: 'you', lead: 'Te toca a ti:', detail: 'elige un helper para continuar.' }
        : { tone: 'waiting', lead: 'En espera', detail: 'de que algún helper se ofrezca.' }
    }
    if (status === 'assigned') return { tone: 'you', lead: 'Te toca a ti:', detail: 'confirma y paga para desbloquear el chat.' }
    if (status === 'in_progress') return { tone: 'you', lead: 'Te toca a ti:', detail: 'coordina por el chat y cierra la tarea cuando termine.' }
    if (status === 'completed') {
      return helperReviewPublished
        ? { tone: 'none', detail: 'Tarea completada y valorada.' }
        : { tone: 'you', lead: 'Te toca a ti:', detail: 'valora al helper.' }
    }
    if (status === 'closed') return { tone: 'none', detail: 'Tarea cerrada.' }
    if (status === 'cancelled') return { tone: 'none', detail: 'Tarea cancelada.' }
    return { tone: 'none', detail: '' }
  }

  if (isHelper) {
    if (status === 'assigned') return { tone: 'waiting', lead: 'En espera', detail: 'de que el requester confirme y pague.' }
    if (status === 'in_progress') return { tone: 'you', lead: 'Te toca a ti:', detail: 'resuelve la tarea y coordina por el chat.' }
    if (status === 'completed') return { tone: 'waiting', lead: 'Ingreso en proceso', detail: '· en espera del cierre y la liberación.' }
    if (status === 'closed') return { tone: 'none', detail: 'Ingreso confirmado.' }
    return { tone: 'none', detail: '' }
  }

  if (canApply) {
    return alreadyApplied
      ? { tone: 'waiting', lead: 'En espera', detail: 'de que el requester elija.' }
      : { tone: 'you', lead: 'Te toca a ti:', detail: 'ofrécete si quieres ayudar.' }
  }

  return { tone: 'none', detail: '' }
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
  const [completionOpen, setCompletionOpen] = useState(false)
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false)
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

  const creatorProfile = task?.creator_profile || {}
  const helperProfile = task?.accepted_profile || {}
  const creatorName = creatorProfile.display_name || creatorProfile.full_name || creatorProfile.username || 'Vecino'
  const helperName = helperProfile.display_name || helperProfile.full_name || helperProfile.username || 'Ayudante'
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
    isOwner,
    isHelper,
    helperReviewPublished: Boolean(helperReviewQuery.data),
  })
  const roleEyebrow = getRoleEyebrow({ isOwner, isHelper, canApply, creatorName })
  const turnContext = getTurnContext({
    status: task?.status,
    isOwner,
    isHelper,
    canApply,
    alreadyApplied: Boolean(currentUserApplication),
    hasPendingApplications: pendingApplications.length > 0,
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
        <div className="task-header-copy">
          <p className="eyebrow">{roleEyebrow}</p>
          <h1>{task.title}</h1>
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
          {turnContext.tone === 'none' ? (
            turnContext.detail ? <p className="task-header-turn">{turnContext.detail}</p> : null
          ) : (
            <p className="task-header-turn">
              <span className={`task-turn-actor${turnContext.tone === 'waiting' ? ' is-waiting' : ''}`}>
                {turnContext.lead}
              </span>
              {turnContext.detail ? ` ${turnContext.detail}` : ''}
            </p>
          )}
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
