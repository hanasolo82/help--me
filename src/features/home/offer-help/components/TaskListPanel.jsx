import HomeEmptyState from '../../components/HomeEmptyState'
import TaskCard from '../../../../features/tasks/components/TaskCard/TaskCard'
import { isTaskTimeWindowExpired } from '../../../tasks/availability/taskAvailability'
import styles from '../../need-help/components/NeedHelpMapLayout.module.css'

function buildHelperActions({
  task,
  isFavorite,
  onContact,
  onToggleFavorite,
  onLocateTask,
  canContact,
  hasPendingOffer,
  isSelectedOffer,
  actionPending,
}) {
  const canLocate = Number.isFinite(Number(task.lat)) && Number.isFinite(Number(task.lng))

  return [
    {
      label: actionPending
        ? hasPendingOffer
          ? 'Retirando...'
          : 'Enviando...'
        : isSelectedOffer
          ? 'Seleccionado'
          : hasPendingOffer
            ? 'Retirar oferta'
            : canContact
              ? 'Ofrecerme'
              : 'No disponible',
      variant: canContact && !hasPendingOffer && !isSelectedOffer ? 'primary' : 'secondary',
      disabled: actionPending || isSelectedOffer || (!canContact && !hasPendingOffer),
      pending: actionPending,
      onClick: () => onContact?.(task),
      title: isSelectedOffer
        ? 'El requester te ha seleccionado para esta tarea'
        : hasPendingOffer
          ? 'Retirar tu oferta para esta tarea'
          : canContact
            ? 'Revisar la solicitud y ofrecerte'
            : 'Solo las tareas abiertas permiten nuevas ofertas',
    },
    {
      label: isFavorite ? 'Quitar favorito' : 'Favorito',
      variant: isFavorite ? 'primary' : 'secondary',
      onClick: () => onToggleFavorite?.(task),
      title: isFavorite ? 'Eliminar de favoritos' : 'Guardar solicitud',
    },
    {
      label: 'Ver en mapa',
      variant: 'secondary',
      disabled: !canLocate,
      onClick: () => onLocateTask?.(task),
      title: canLocate ? 'Centrar la tarea en el mapa' : 'Esta tarea no tiene coordenadas públicas',
    },
  ]
}

export default function TaskListPanel({
  tasks = [],
  visibleTasks = [],
  selectedTaskId = null,
  onSelectTask,
  onOpenDetail,
  onContact,
  onToggleFavorite,
  favoriteTaskIds = [],
  currentUserId = null,
  loading = false,
  error = '',
  offerError = '',
  pendingOfferTaskId = null,
  locationLabel = 'Tu zona',
  hasLocation = true,
  onRequestLocation,
  emptyTitle = 'No hay solicitudes disponibles en esta parte del mapa.',
  emptyDescription = 'Mueve el mapa o revisa el tipo de actividad para encontrar más solicitudes.',
  emptyActionLabel = null,
  emptyTone = 'warning',
}) {
  return (
    <aside className={styles.panelShell}>
      <div className={styles.panelMeta}>
        <p className="muted">{locationLabel}</p>
        <strong>{tasks.length} solicitudes abiertas</strong>
        <span className="muted">{visibleTasks.length} visibles en esta pantalla del mapa</span>
      </div>

      {!hasLocation ? (
        <section className={styles.locationBanner}>
          <strong>Activa tu ubicación para ordenar mejor las tareas.</strong>
          <p className="muted">O busca una zona desde el header para mover el mapa a donde te interesa.</p>
          {onRequestLocation ? (
            <button type="button" className="primary-action" onClick={onRequestLocation}>
              Usar mi ubicación
            </button>
          ) : null}
        </section>
      ) : null}

      {loading && <p className="muted">Buscando tareas cercanas...</p>}
      {error && <p className="auth-message error">{error}</p>}
      {offerError && <p className="auth-message error">{offerError}</p>}

      <div className={styles.listScroll}>
        {!loading && !error && visibleTasks.length === 0 ? (
          <HomeEmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            onAction={null}
            tone={emptyTone}
          />
        ) : null}

        {visibleTasks.map(({ task, distance }) => {
          const isFavorite = favoriteTaskIds.includes(task.id)
          const applicationStatus = task.current_user_application?.status
          const hasPendingOffer = applicationStatus === 'pending'
          const isSelectedOffer = applicationStatus === 'selected'
          const hasActiveOffer = hasPendingOffer || isSelectedOffer
          const canContact = (
            task.status === 'open' &&
            !isTaskTimeWindowExpired(task) &&
            task.created_by !== currentUserId &&
            !hasActiveOffer
          )
          const actionPending = pendingOfferTaskId === task.id

          return (
            <TaskCard
              key={task.id}
              task={task}
              distanceKm={distance}
              showDistance
              expanded={selectedTaskId === task.id}
              primaryActionLabel="Ver detalle"
              primaryActionVariant="primary"
              onPrimaryAction={() => onOpenDetail?.(task)}
              helperActions={buildHelperActions({
                task,
                isFavorite,
                onContact,
                onToggleFavorite,
                onLocateTask: onSelectTask,
                canContact,
                hasPendingOffer,
                isSelectedOffer,
                actionPending,
              })}
            />
          )
        })}
      </div>
    </aside>
  )
}
