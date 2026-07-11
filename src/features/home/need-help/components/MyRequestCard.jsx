import styles from './MyRequestCard.module.css'
import { formatTaskAvailabilityShort, isTaskTimeWindowExpired } from '../../../tasks/availability/taskAvailability'
import ActivityBadge from '../../../tasks/categories/ActivityBadge'
import { getTaskStatusHint, getTaskStatusLabel, STATUS_HINT_PHRASES } from '../../../tasks/utils/taskStatusLabels'

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

function renderHintWithAction(hint) {
  const actionCopy = STATUS_HINT_PHRASES.action
  const actionIndex = hint.indexOf(actionCopy)

  if (actionIndex < 0) return hint

  return (
    <>
      {hint.slice(0, actionIndex)}
      <span className={styles.statusAction}>{actionCopy}</span>
      {hint.slice(actionIndex + actionCopy.length)}
    </>
  )
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
  const dateLabel = formatDate(task.cancelled_at || task.published_at || task.modified_at || task.updated_at || task.created_at)
  const availabilityLabel = formatTaskAvailabilityShort(task)
  const isExpired = task.status === 'open' && isTaskTimeWindowExpired(task)
  const isOpen = task.status === 'open' && !isExpired
  const isPendingConfirmation = task.status === 'assigned'
  const applicationCount = Number(task.application_count || 0)
  const hasInterestedHelpers = isOpen && applicationCount > 0
  const isReviewed = reviewedTaskIds.has(task.id)
  const helperProfile = task.accepted_profile || {}
  const helperName = helperProfile.display_name || helperProfile.full_name || helperProfile.username || 'Un helper'
  const statusLabel = isExpired ? 'Plazo finalizado' : getTaskStatusLabel(task.status)
  const statusHint = isExpired
    ? 'Ya no admite nuevas ofertas. Reprograma la solicitud o retírala.'
    : getTaskStatusHint({
      status: task.status,
      viewerRole: 'requester',
      applicationCount,
      helperName,
      hasReview: isReviewed,
    })

  return (
    <article className={`${styles.card} ${isPendingConfirmation ? styles.pendingConfirmationCard : ''}`.trim()}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{task.title}</p>
          <div className={styles.meta}>
            <ActivityBadge category={task.category} compact />
          </div>
          <div className={styles.statusEditorial}>
            <strong>{statusLabel}</strong>
            {statusHint ? <p>{renderHintWithAction(statusHint)}</p> : null}
          </div>
        </div>
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
        {isOpen && (
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

        {isExpired && (
          <>
            <button type="button" className="secondary-action" onClick={() => onEdit?.(task)}>
              Reprogramar
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
