import { Marker, Popup, Tooltip } from 'react-leaflet'
import { createOwnTaskPinIcon } from '../../../../shared/ui/map/mapMarkerIcons'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import { getTaskCategoryLabel } from '../../../tasks/categories/taskCategories'
import RequesterTaskSummary from './RequesterTaskSummary'
import markerStyles from '../../../../shared/ui/map/MapMarkerSystem.module.css'

/**
 * Marcador de solicitud propia: pin-gota con glifo de categoría y badge de
 * respuestas. Hover → tooltip compacto; clic → popup mini-tarjeta con CTAs.
 * Con `detailMode="sheet"` (móvil) el clic delega en el padre, que abre la
 * misma mini-tarjeta como bottom-sheet en lugar del popup.
 */
export default function RequesterTaskMarker({
  task,
  selected = false,
  onSelect,
  onEdit,
  onRetire,
  onOpenDetail,
  retirePending = false,
  detailMode = 'popup',
}) {
  if (!task) return null

  const responses = Number(task.application_count ?? 0)
  const categoryLabel = getTaskCategoryLabel(task.category)
  const availabilityLabel = formatTaskAvailabilityShort(task)

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={createOwnTaskPinIcon({ task, selected, responses })}
      eventHandlers={{
        click: () => onSelect?.(task),
      }}
    >
      <Tooltip direction="top" className={markerStyles.pinTooltipShell} opacity={1}>
        <span className={markerStyles.pinTooltip}>
          <span className={markerStyles.pinTooltipTitle}>{task.title}</span>
          <span className={markerStyles.pinTooltipMeta}>
            {categoryLabel} · {availabilityLabel}
          </span>
        </span>
      </Tooltip>

      {detailMode === 'popup' ? (
        <Popup maxWidth={300} className={markerStyles.taskPopupShell}>
          <RequesterTaskSummary
            task={task}
            onEdit={onEdit}
            onRetire={onRetire}
            onOpenDetail={onOpenDetail}
            retirePending={retirePending}
          />
        </Popup>
      ) : null}
    </Marker>
  )
}
