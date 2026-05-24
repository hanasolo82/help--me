import { getAvatarInitial } from '../../../../utils/avatar'
import styles from './TaskPreviewModal.module.css'

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return 'Cerca de ti'
  }

  return `${Number(distanceKm).toFixed(1)} km`
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
  onToggleFavorite,
  onLocateTask,
}) {
  if (!open || !task) return null

  const creator = task.creator_profile || {}
  const creatorName = creator.display_name || creator.full_name || creator.username || 'Vecino'
  const creatorInitial = getAvatarInitial(creatorName)
  const canContact = task.status === 'open' && task.created_by !== currentUserId

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${task.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Solicitud cerca de ti</p>
            <h2 className={styles.title}>{task.title}</h2>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar vista previa">
            ×
          </button>
        </div>

        <div className={styles.meta}>
          <span>{task.category}</span>
          <span>{task.status}</span>
          <span>{formatDistance(distanceKm)}</span>
          <span>{Number(task.price ?? 0)} EUR</span>
        </div>

        <div className={styles.body}>
          <div className="user-strip">
            <span className="avatar-small">
              {creator.avatar_url ? <img src={creator.avatar_url} alt={creatorName} /> : creatorInitial}
            </span>
            <div>
              <strong>{creatorName}</strong>
              <p>{creator.rating ? `${creator.rating}/5` : 'Publicada por un vecino'}</p>
            </div>
          </div>

          <p className={styles.description}>{task.description}</p>

          <div className={styles.statusNote}>
            {canContact
              ? 'Puedes abrir chat, guardar la tarea o verla en el mapa.'
              : 'Esta tarea ya no está abierta para contacto nuevo, o pertenece a tu propio perfil. Puedes verla, pero el contacto directo está bloqueado.'}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => onLocateTask?.(task)}>
            Ver en mapa
          </button>
          <button type="button" className="secondary-action" onClick={() => onToggleFavorite?.(task)}>
            {isFavorite ? 'Quitar favorito' : 'Añadir favorito'}
          </button>
          <button type="button" className="secondary-action" onClick={() => onContact?.(task)} disabled={!canContact}>
            {canContact ? 'Contactar' : 'Contacto bloqueado'}
          </button>
          <button type="button" className="primary-action" onClick={() => onOpenDetail?.(task)}>
            Ver detalle
          </button>
        </div>
      </section>
    </div>
  )
}
