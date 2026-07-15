import { Marker, Popup, Tooltip } from 'react-leaflet'
import { createOwnTaskPinIcon } from '../../../shared/ui/map/mapMarkerIcons'
import { formatTaskAvailabilityShort } from '../../tasks/availability/taskAvailability'
import { getTaskCategoryLabel } from '../../tasks/categories/taskCategories'
import HelperTaskSummary from './HelperTaskSummary'
import markerStyles from '../../../shared/ui/map/MapMarkerSystem.module.css'

// Marcador de solicitud publicada para el mapa del helper. Reutiliza el mismo
// pin-gota limpio del requester (createOwnTaskPinIcon: glifo de categoría +
// badge de respuestas) y el mismo popup de detalle, con las acciones del helper
// ("Ver solicitud" / "Ofrecerme"). Sustituye a la pastilla de precio anterior,
// que se renderizaba defectuosa ("0 €" con la punta incompleta).
export default function HelperTaskMarker({
  task,
  selected = false,
  offer = null,
  onSelect,
  onOpenDetail,
  onOffer,
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

      <Popup maxWidth={300} className={markerStyles.taskPopupShell}>
        <HelperTaskSummary
          task={task}
          offer={offer}
          onOpenDetail={onOpenDetail}
          onOffer={onOffer}
        />
      </Popup>
    </Marker>
  )
}
