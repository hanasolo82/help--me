import ActivityBadge from '../../tasks/categories/ActivityBadge'
import { formatTaskAvailabilityShort } from '../../tasks/availability/taskAvailability'
import { getTaskUrgency } from '../../tasks/urgency/taskUrgency'
import markerStyles from '../../../shared/ui/map/MapMarkerSystem.module.css'

function getReadableLocation(task) {
  const label = task?.location_label || task?.zone || task?.location || ''
  return label.trim() || 'Zona del mapa'
}

// Misma mini-tarjeta de popup que el requester (RequesterTaskSummary): reutiliza
// exactamente los estilos de MapMarkerSystem.module.css (taskPopup*), pero las
// acciones son las del helper —"Ver solicitud" y "Ofrecerme"— en vez de
// Editar/Retirar, coherentes con la tarjeta lateral.
export default function HelperTaskSummary({
  task,
  offer = null,
  onOpenDetail,
  onOffer,
}) {
  if (!task) return null

  const responses = Number(task.application_count ?? 0)
  const availabilityLabel = formatTaskAvailabilityShort(task)
  const urgency = getTaskUrgency(task)

  return (
    <article className={markerStyles.taskPopup}>
      <p className={markerStyles.taskPopupEyebrow}>
        <span className={markerStyles.taskPopupDot} aria-hidden="true" />
        Solicitud de un vecino
      </p>
      <h3 className={markerStyles.taskPopupTitle}>{task.title}</h3>

      <div className={markerStyles.taskPopupMeta}>
        <ActivityBadge category={task.category} compact />
      </div>

      {task.description ? (
        <p className={markerStyles.taskPopupDescription}>{task.description}</p>
      ) : null}

      <dl className={markerStyles.taskPopupFacts}>
        <div>
          <dt>Dónde</dt>
          <dd>{getReadableLocation(task)}</dd>
        </div>
        <div>
          <dt>Cuándo</dt>
          <dd>{availabilityLabel}</dd>
        </div>
        {urgency ? (
          <div>
            <dt>Prioridad</dt>
            <dd>{urgency.label} · {urgency.detail}</dd>
          </div>
        ) : null}
        <div>
          <dt>Respuestas</dt>
          <dd>{responses > 0 ? responses : 'Aún sin respuestas'}</dd>
        </div>
      </dl>

      <div className={markerStyles.taskPopupActions}>
        <button
          type="button"
          className={markerStyles.taskPopupPrimary}
          onClick={() => onOpenDetail?.(task)}
        >
          Ver solicitud
        </button>
        {offer ? (
          <button
            type="button"
            className={markerStyles.taskPopupSecondary}
            onClick={() => onOffer?.(task)}
            disabled={offer.disabled}
            aria-busy={offer.pending || undefined}
          >
            {offer.label}
          </button>
        ) : null}
      </div>
    </article>
  )
}
