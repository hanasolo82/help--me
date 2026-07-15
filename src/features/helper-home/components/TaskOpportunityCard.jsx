import { BadgeCheck, ChevronRight, Clock, MapPin, Star } from 'lucide-react'
import UserAvatar from '../../../shared/ui/UserAvatar'
import { CategoryIcon, style as designStyle } from '../../../design'
import { getTaskCategoryLabel } from '../../tasks/categories/taskCategories'
import { formatTaskAvailabilityShort } from '../../tasks/availability/taskAvailability'
import { getTaskUrgency } from '../../tasks/urgency/taskUrgency'
import styles from '../styles/helperHome.module.css'

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return 'Cerca de ti'
  }

  return `${Number(distanceKm).toFixed(1)} km`
}

function formatPrice(value) {
  const price = Number(value ?? 0)
  if (!Number.isFinite(price)) return '0 €'
  return `${Math.round(price)} €`
}

function formatRequesterRating(profile) {
  const rating = Number(profile?.rating ?? 0)
  const reviews = Number(profile?.reviews_count ?? profile?.review_count ?? 0)

  if (!Number.isFinite(rating) || rating <= 0) {
    return 'Sin valoraciones'
  }

  return reviews > 0 ? `${rating.toFixed(1)}/5 · ${reviews}` : `${rating.toFixed(1)}/5`
}

function formatAge(task) {
  const date = new Date(task?.published_at || task?.updated_at || task?.created_at || Date.now())
  if (Number.isNaN(date.getTime())) return 'Hace poco'

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

// Tarjeta de solicitud publicada para el mapa del helper. Reutiliza el lenguaje
// visual de la HelperCard del requester (avatar con aro de estado, nombre con
// insignia, valoración con estrella, distancia con pin, chips de categoría con
// icono Lucide y acción "Ver solicitud" con chevron), adaptado al dominio de la
// tarea: hero de precio, urgencia y quién la publica.
export default function TaskOpportunityCard({
  task,
  distanceKm,
  selected = false,
  onSelect,
  onOpenDetail,
  offer = null,
  onOffer,
}) {
  const requester = task?.creator_profile || null
  const requesterName =
    requester?.display_name || requester?.full_name || requester?.username || 'Vecino'
  const categoryLabel = getTaskCategoryLabel(task?.category)
  const urgency = getTaskUrgency(task)
  const availabilityLabel = formatTaskAvailabilityShort(task)
  const isDirect = task?.is_direct_request === true
  const locationLabel = task?.zone || task?.location_label || task?.location || 'Zona no indicada'
  const ratingLabel = formatRequesterRating(requester)

  return (
    <article
      className={selected ? `${styles.taskCard} ${styles.taskCardSelected}` : styles.taskCard}
      onClick={() => onSelect?.(task)}
      aria-current={selected || undefined}
    >
      <div className={styles.taskCardTop}>
        <div className={urgency ? `${styles.taskAvatarWrap} ${styles.taskAvatarUrgent}` : styles.taskAvatarWrap}>
          <UserAvatar
            src={requester?.avatar_url}
            name={requesterName}
            alt={requesterName}
            size="lg"
            variant="circle"
            verified={false}
            className={styles.taskAvatar}
          />
        </div>

        <div className={styles.taskCardContent}>
          <div className={styles.taskCardHeading}>
            <div className={styles.taskTitleRow}>
              <strong className={styles.taskTitle}>{task?.title}</strong>
              {isDirect ? (
                <span
                  className={styles.taskDirectIcon}
                  aria-label="Solicitud directa para ti"
                  title="Solicitud directa para ti"
                >
                  <BadgeCheck aria-hidden="true" strokeWidth={2.25} />
                </span>
              ) : null}
            </div>
            <span className={styles.taskPrice}>{formatPrice(task?.price)}</span>
          </div>

          <div className={styles.taskTrustLine}>
            <span className={styles.taskRating} aria-label={`Quien publica: ${requesterName}, ${ratingLabel}`}>
              <Star aria-hidden="true" strokeWidth={2.2} />
              {requesterName}
            </span>
            <span className={styles.taskDistance}>
              <MapPin aria-hidden="true" strokeWidth={2.2} />
              {formatDistance(distanceKm)}
            </span>
            <span className={styles.taskDistance}>
              <Clock aria-hidden="true" strokeWidth={2.2} />
              {formatAge(task)}
            </span>
          </div>

          {urgency ? (
            <div className={styles.taskUrgency} aria-label="Urgencia">
              <strong>{urgency.label}</strong>
              {urgency.detail ? <span>{urgency.detail}</span> : null}
            </div>
          ) : null}

          <p className={styles.taskDescription}>
            {task?.description || 'Sin descripción adicional.'}
          </p>

          <div className={styles.taskChips} aria-label="Detalles de la solicitud">
            <span>
              <CategoryIcon category={task?.category} size={designStyle.iconSize.tag} tone="light" />
              {categoryLabel}
            </span>
            <span className={styles.taskChipMuted}>{locationLabel}</span>
            <span className={styles.taskChipMuted}>{availabilityLabel}</span>
          </div>
        </div>
      </div>

      <div className={styles.taskActions}>
        {offer ? (
          <button
            type="button"
            className="primary-action"
            onClick={(event) => {
              event.stopPropagation()
              onOffer?.(task)
            }}
            disabled={offer.disabled}
            aria-busy={offer.pending || undefined}
          >
            {offer.label}
          </button>
        ) : null}

        <button
          type="button"
          className={styles.taskDetailLink}
          onClick={(event) => {
            event.stopPropagation()
            onSelect?.(task)
            onOpenDetail?.(task)
          }}
        >
          Ver solicitud
          <ChevronRight aria-hidden="true" strokeWidth={2.2} />
        </button>
      </div>
    </article>
  )
}
