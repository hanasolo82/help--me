import Modal, { ModalBody, ModalHeader } from '../../../../shared/ui/Modal/Modal'
import UserAvatar from '../../../../shared/ui/UserAvatar'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import ActivityBadge from '../../../tasks/categories/ActivityBadge'
import { getTaskStatusLabel } from '../../../tasks/utils/taskStatusLabels'
import styles from './TaskPreviewModal.module.css'

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return 'Cerca de ti'
  }

  return `${Number(distanceKm).toFixed(1)} km`
}

function formatPublishedAt(value) {
  if (!value) return 'Fecha no indicada'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no indicada'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function TaskPreviewModal({
  open,
  task,
  distanceKm = null,
  isFavorite = false,
  currentUserId = null,
  onClose,
  onOpenDetail,
  onContact,
  offerActionPending = false,
  offerError = '',
  onToggleFavorite,
  onLocateTask,
}) {
  if (!task) return null

  const creator = task.creator_profile || {}
  const creatorName = creator.display_name || creator.full_name || creator.username || 'Vecino'
  const applicationStatus = task.current_user_application?.status
  const hasPendingOffer = applicationStatus === 'pending'
  const isSelectedOffer = applicationStatus === 'selected'
  const hasActiveOffer = hasPendingOffer || isSelectedOffer
  const canContact = task.status === 'open' && task.created_by !== currentUserId && !hasActiveOffer
  const publishedAt = task.published_at || task.created_at

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader eyebrow="Solicitud cerca de ti" title={task.title} closeLabel="Cerrar vista previa" />

      <div className={styles.meta}>
          <div className={styles.activityMeta}>
            <ActivityBadge category={task.category} compact />
          </div>
          <span>{getTaskStatusLabel(task.status)}</span>
          <span>{formatTaskAvailabilityShort(task)}</span>
          <span>{formatPublishedAt(publishedAt)}</span>
          <span>{formatDistance(distanceKm)}</span>
          <span>{Number(task.price ?? 0)} EUR</span>
        </div>

        <ModalBody>
          <div className="user-strip">
            <UserAvatar
              src={creator.avatar_url}
              name={creatorName}
              alt={creatorName}
              size="sm"
              className="avatar-small"
            />
            <div>
              <strong>{creatorName}</strong>
              <p>{creator.rating ? `${creator.rating}/5` : 'Publicada por un vecino'}</p>
            </div>
          </div>

          <p className={styles.description}>{task.description}</p>

          {isSelectedOffer ? (
            <div className={styles.statusNote}>
              El requester te ha seleccionado para esta tarea. Abre el detalle para continuar.
            </div>
          ) : !hasActiveOffer ? (
            <div className={styles.statusNote}>
              {canContact
                ? 'Puedes revisar la solicitud, ofrecerte, guardarla o verla en el mapa.'
                : 'Esta tarea ya no está abierta para nuevas ofertas, o pertenece a tu propio perfil. Puedes verla, pero no ofrecerte.'}
            </div>
          ) : null}
          {offerError ? <p className="auth-message error" role="alert">{offerError}</p> : null}
        </ModalBody>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => onLocateTask?.(task)}>
            Ver en mapa
          </button>
          <button type="button" className="secondary-action" onClick={() => onToggleFavorite?.(task)}>
            {isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => onContact?.(task)}
            disabled={offerActionPending || isSelectedOffer || (!canContact && !hasPendingOffer)}
          >
            {offerActionPending
              ? hasPendingOffer
                ? 'Retirando...'
                : 'Enviando...'
              : isSelectedOffer
                ? 'Seleccionado'
                : hasPendingOffer
                  ? 'Retirar oferta'
                  : canContact
                    ? 'Ofrecerme'
                    : 'No disponible'}
          </button>
          <button type="button" className="primary-action" onClick={() => onOpenDetail?.(task)}>
            Ver detalle
          </button>
        </div>
    </Modal>
  )
}
