import ActivityBadge from '../../../tasks/categories/ActivityBadge'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import { getTaskUrgency } from '../../../tasks/urgency/taskUrgency'
import markerStyles from '../../../../shared/ui/map/MapMarkerSystem.module.css'

function getReadableLocation(task) {
  const label = task?.location_label || task?.zone || task?.location || ''
  return label.trim() || 'Zona del mapa'
}

/**
 * Mini-tarjeta de una solicitud propia: la misma pieza sirve dentro del popup
 * de Leaflet (desktop) y del bottom-sheet (móvil), para que ambos caminos
 * muestren exactamente la misma información y acciones.
 */
export default function RequesterTaskSummary({
  task,
  onEdit,
  onRetire,
  onOpenDetail,
  retirePending = false,
}) {
  if (!task) return null

  const responses = Number(task.application_count ?? 0)
  const availabilityLabel = formatTaskAvailabilityShort(task)
  const urgency = getTaskUrgency(task)

  return (
    <article className={markerStyles.taskPopup}>
      <p className={markerStyles.taskPopupEyebrow}>
        <span className={markerStyles.taskPopupDot} aria-hidden="true" />
        Tu solicitud · Activa, visible para vecinos
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
          Ver detalle
        </button>
        <button
          type="button"
          className={markerStyles.taskPopupSecondary}
          onClick={() => onEdit?.(task)}
        >
          Editar
        </button>
        <button
          type="button"
          className={`${markerStyles.taskPopupSecondary} ${markerStyles.taskPopupDanger}`}
          onClick={() => onRetire?.(task)}
          disabled={retirePending}
        >
          {retirePending ? 'Retirando…' : 'Retirar'}
        </button>
      </div>
    </article>
  )
}
