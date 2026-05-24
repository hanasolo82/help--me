import styles from './TaskCard.module.css'
import editIcon from '../../../../assets/icons/svgviewer-output.svg'
import starIcon from '../../../../assets/icons/Orion_star.svg'
import messageIcon from '../../../../assets/icons/message.svg'

// Card de tarea conectada a Supabase. Las columnas siguen el esquema actual:
// id, title, description, price (numeric en euros), category, lat, lng, status, created_by, accepted_by.
const statusLabels = {
  draft: 'Borrador',
  open: 'Publicada',
  assigned: 'Asignada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
}

function formatPublicationAge(task) {
  if (task.status === 'draft') {
    return 'Pendiente de publicar'
  }

  if (task.status === 'cancelled') {
    const cancelledAt = new Date(task.cancelled_at || task.updated_at || task.created_at)

    if (Number.isNaN(cancelledAt.getTime())) {
      return 'Cancelada'
    }

    const elapsedMs = Date.now() - cancelledAt.getTime()
    const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))

    if (elapsedMinutes < 1) {
      return 'Cancelada ahora'
    }

    if (elapsedMinutes < 60) {
      return `Cancelada hace ${elapsedMinutes} min`
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60)

    if (elapsedHours < 24) {
      return `Cancelada hace ${elapsedHours} h`
    }

    const elapsedDays = Math.floor(elapsedHours / 24)

    if (elapsedDays < 7) {
      return `Cancelada hace ${elapsedDays} d`
    }

    return `Cancelada el ${cancelledAt.toLocaleDateString('es-ES')}`
  }

  const openedAt = new Date(task.published_at || task.created_at)

  if (Number.isNaN(openedAt.getTime())) {
    return 'Fecha desconocida'
  }

  const elapsedMs = Date.now() - openedAt.getTime()
  const elapsedMinutes = Math.max(0, Math.floor(elapsedMs / 60000))

  if (elapsedMinutes < 1) {
    return 'Publicada ahora'
  }

  if (elapsedMinutes < 60) {
    return `Publicada hace ${elapsedMinutes} min`
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60)

  if (elapsedHours < 24) {
    return `Publicada hace ${elapsedHours} h`
  }

  const elapsedDays = Math.floor(elapsedHours / 24)

  if (elapsedDays < 7) {
    return `Publicada hace ${elapsedDays} d`
  }

  return `Publicada el ${openedAt.toLocaleDateString('es-ES')}`
}

function ChatIcon() {
  return (
    <img src={messageIcon} alt="" aria-hidden="true" />
  )
}

export default function TaskCard({
  task,
  distanceKm,
  showDistance = true,
  showCancelAction = false,
  onCancelAction,
  showEditAction = false,
  onEditAction,
  showChatAction = false,
  onChatAction,
  chatActionDisabled = false,
  expanded = false,
  primaryActionLabel = 'Ver detalle',
  primaryActionVariant = 'primary',
  primaryActionDisabled = false,
  onPrimaryAction,
  secondaryActionLabel,
  secondaryActionVariant = 'link',
  secondaryActionDisabled = false,
  onSecondaryAction,
  helperActions = [],
}) {
  const priceEuros = Number(task.price ?? 0)
  const creator = task.creator_profile
  const creatorName = creator?.display_name || creator?.full_name || creator?.username || 'Vecino'
  const creatorInitial = creatorName.charAt(0).toUpperCase()
  const creatorRating = Number(creator?.rating ?? 0)
  const ratingValue = Number.isFinite(creatorRating) ? Math.max(0, Math.min(5, Math.round(creatorRating))) : 0
  const ratingLabel = `${ratingValue}/5`
  const helper = task.accepted_profile
  const helperName = helper?.display_name || helper?.full_name || helper?.username || 'Ayudante'
  const distanceLabel = Number.isFinite(distanceKm) ? `${distanceKm} km` : 'Distancia desconocida'
  const isDetailActionLabel = (label) => ['Ver detalle', 'Ocultar'].includes(label)
  const isPublishActionLabel = (label) => label === 'Publicar tarea'
  const metaItems = [
    task.category,
    statusLabels[task.status] || task.status,
    formatPublicationAge(task),
    showDistance ? distanceLabel : null,
  ].filter(Boolean)

  return (
    <article className={styles.card}>
      <div className={styles.userRow}>
        <span className={styles.avatarWrap}>
          {creator?.avatar_url ? <img src={creator.avatar_url} alt="" /> : creatorInitial}
        </span>
        <div>
          <strong>{creatorName}</strong>
          <p className={styles.ratingLine}>
            <img src={starIcon} alt="" aria-hidden="true" />
            <span>{ratingLabel}</span>
          </p>
          {helper && (
            <p className={styles.helperLine}>
              Ayudante: {helperName}
            </p>
          )}
        </div>
      </div>

      {(showEditAction || showCancelAction || showChatAction) && (
        <div className={styles.cardActions}>
          {showChatAction && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onChatAction}
              aria-label="Abrir chat"
              title="Abrir chat"
              disabled={chatActionDisabled}
            >
              <ChatIcon />
            </button>
          )}

          {showEditAction && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onEditAction}
              aria-label="Editar tarea"
              title="Editar tarea"
            >
              <img src={editIcon} alt="" aria-hidden="true" />
            </button>
          )}

          {showCancelAction && (
            <button
              type="button"
              className={styles.iconButton}
              onClick={onCancelAction}
              aria-label="Eliminar tarea"
              title="Eliminar tarea"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className={styles.topSection}>
        <div>
          <h2 className={styles.title}>
            {task.title}
          </h2>

          <p className={styles.meta}>
            {metaItems.join(' · ')}
          </p>
        </div>

        <span className={styles.price}>
          {priceEuros} EUR
        </span>
      </div>

      <div className={styles.descriptionContainer}>
        <p className={expanded ? styles.descriptionExpanded : styles.description}>
          {task.description}
        </p>
      </div>

      <div className={styles.actions}>
        {secondaryActionLabel && (
          <button
            type="button"
            className={
              isDetailActionLabel(secondaryActionLabel)
                ? styles.detailButton
                : secondaryActionVariant === 'link'
                  ? 'link-button'
                  : styles.buttonSecondary
            }
            onClick={onSecondaryAction}
            disabled={secondaryActionDisabled}
          >
            {secondaryActionLabel}
          </button>
        )}

        {primaryActionLabel && (
          <button
            type="button"
            className={
              isDetailActionLabel(primaryActionLabel)
                ? styles.detailButton
                : isPublishActionLabel(primaryActionLabel)
                  ? styles.publishButton
                : primaryActionVariant === 'link'
                  ? 'link-button'
                  : styles.button
            }
            onClick={onPrimaryAction}
            disabled={primaryActionDisabled}
          >
            {primaryActionLabel}
          </button>
        )}
      </div>

      {helperActions.length > 0 && (
        <div className={styles.helperActions}>
          {helperActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={
                action.variant === 'primary'
                  ? styles.helperPrimaryAction
                  : action.variant === 'danger'
                    ? styles.helperDangerAction
                    : styles.helperSecondaryAction
              }
              onClick={action.onClick}
              disabled={action.disabled}
              aria-label={action.ariaLabel || action.label}
              title={action.title || action.label}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  )
}
