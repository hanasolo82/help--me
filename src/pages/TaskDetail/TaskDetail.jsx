import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { acceptTask } from '../../services/tasksService'
import { startTaskCheckout } from '../../services/paymentsService'
import { reverseGeocodeLocation } from '../../services/locationService'
import { getAvatarInitial } from '../../utils/avatar'
import { useTaskById } from '../../hooks/useTaskById'
import TaskChatModal from '../../components/task/TaskChatModal'
import messageIcon from '../../assets/icons/message.svg'

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
    onSuccess: async ({ conversation }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['chats', user?.id ?? null] }),
      ])
      navigate(`/chat/${conversation.id}`, { replace: true })
    },
  })

  const checkoutMutation = useMutation({
    mutationFn: () => startTaskCheckout(id),
    onSuccess: async ({ checkout_url }) => {
      await queryClient.invalidateQueries({ queryKey: ['task', id] })
      window.location.href = checkout_url
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
  const canStartCheckout = Boolean(task) && isOwner && task.status === 'assigned' && Boolean(task.accepted_by)
  const canCloseTask = Boolean(task) && isOwner && Boolean(task.accepted_by) && ['in_progress', 'completed'].includes(task.status)
  const canOpenChat =
    Boolean(task) &&
    ((task.status === 'open' && !isOwner) ||
      (['assigned', 'in_progress', 'completed', 'closed'].includes(task.status) && (isOwner || isHelper)))

  async function handleAccept() {
    acceptMutation.mutate()
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
          <strong>{task.status}</strong>
        </div>
      </section>

      <section className="detail-panel">
        <h2>Descripcion</h2>
        <p>{task.description}</p>
      </section>

      {(error || acceptMutation.error) && (
        <p className="auth-message error">{error || acceptMutation.error?.message || 'Ha ocurrido un error.'}</p>
      )}

      {checkoutMutation.error && (
        <p className="auth-message error">{checkoutMutation.error?.message || 'No hemos podido preparar el pago.'}</p>
      )}

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

        {canStartCheckout && (
          <button
            type="button"
            className="primary-action sticky-action"
            onClick={() => checkoutMutation.mutate()}
            disabled={checkoutMutation.isPending}
          >
            {checkoutMutation.isPending ? 'Preparando pago...' : 'Pagar tarea'}
          </button>
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
      </div>

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
