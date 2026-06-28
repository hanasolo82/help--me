import styles from './MyRequestCard.module.css'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import ActivityBadge from '../../../tasks/categories/ActivityBadge'

const STATUS_COPY = {
  open: 'Activa',
  assigned: 'Oferta pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  draft: 'Borrador',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function MyRequestCard({
  task,
  onFocusMap,
  onEdit,
  onRetire,
  onOpenChat,
  onOpenDetail,
  onOpenSummary,
  onReview,
  reviewedTaskIds = new Set(),
}) {
  const statusLabel = STATUS_COPY[task.status] || task.status
  const dateLabel = formatDate(task.cancelled_at || task.published_at || task.modified_at || task.updated_at || task.created_at)
  const availabilityLabel = formatTaskAvailabilityShort(task)
  const isPendingConfirmation = task.status === 'assigned'
  const applicationCount = Number(task.application_count || 0)
  const hasInterestedHelpers = task.status === 'open' && applicationCount > 0
  const isReviewed = reviewedTaskIds.has(task.id)
  const helperProfile = task.accepted_profile || {}
  const helperName = helperProfile.display_name || helperProfile.full_name || helperProfile.username || 'Un helper'

  return (
    <article className={`${styles.card} ${isPendingConfirmation ? styles.pendingConfirmationCard : ''}`.trim()}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{task.title}</p>
          <div className={styles.meta}>
            <ActivityBadge category={task.category} compact />
          </div>
        </div>
        <span className={styles.status}>{statusLabel}</span>
      </div>

      <div className={styles.detailRow}>
        <span>{dateLabel}</span>
        <span>{availabilityLabel}</span>
        <span>{task.price ? `${Number(task.price)} EUR` : 'Precio libre'}</span>
      </div>

      {isPendingConfirmation ? (
        <p className={styles.confirmationNotice}>
          {helperName} está listo para ayudarte. Decide si quieres confirmar y pagar o rechazar esta oferta.
        </p>
      ) : null}

      {hasInterestedHelpers ? (
        <p className={styles.interestNotice}>
          {applicationCount === 1
            ? '1 helper se ha ofrecido para ayudarte.'
            : `${applicationCount} helpers se han ofrecido para ayudarte.`}
        </p>
      ) : null}

      <div className={styles.actions}>
        {task.status === 'open' && (
          <>
            {hasInterestedHelpers ? (
              <button type="button" className="primary-action" onClick={() => onOpenDetail?.(task)}>
                Ver interesados
              </button>
            ) : null}
            <button type="button" className="secondary-action" onClick={() => onFocusMap?.(task)}>
              Ver en mapa
            </button>
            <button type="button" className="secondary-action" onClick={() => onEdit?.(task)}>
              Editar
            </button>
            <button type="button" className="danger-action" onClick={() => onRetire?.(task)}>
              Retirar
            </button>
          </>
        )}

        {task.status === 'assigned' && (
          <button type="button" className="primary-action" onClick={() => onOpenDetail?.(task)}>
            Decidir ahora
          </button>
        )}

        {task.status === 'in_progress' && (
          <>
            <button type="button" className="secondary-action" onClick={() => onOpenChat?.(task)}>
              Ver chat
            </button>
            <button type="button" className="secondary-action" onClick={() => onOpenDetail?.(task)}>
              Ver detalle
            </button>
          </>
        )}

        {['completed', 'closed'].includes(task.status) && (
          <>
            <button type="button" className="secondary-action" onClick={() => onOpenSummary?.(task)}>
              Ver resumen
            </button>
            {isReviewed ? (
              <span className={styles.reviewedState}>Valorada</span>
            ) : (
              <button type="button" className="secondary-action" onClick={() => onReview?.(task)}>
                Valorar
              </button>
            )}
          </>
        )}

        {task.status === 'cancelled' && (
          <button type="button" className="secondary-action" onClick={() => onOpenDetail?.(task)}>
            Ver detalle
          </button>
        )}
      </div>
    </article>
  )
}
