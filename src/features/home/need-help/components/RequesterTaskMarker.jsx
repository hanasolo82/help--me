import { Marker, Popup } from 'react-leaflet'
import MapPopupCard from '../../../../shared/ui/map/MapPopupCard'
import { createTaskMarkerIcon } from '../../../../shared/ui/map/mapMarkerIcons'

const STATUS_COPY = {
  open: 'Activa',
  assigned: 'Oferta pendiente',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  draft: 'Borrador',
}

export default function RequesterTaskMarker({ task, selected = false, onSelect }) {
  if (!task) return null

  const publishedAt = task.published_at || task.created_at
  const statusLabel = STATUS_COPY[task.status] || task.status

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={createTaskMarkerIcon({ task, selected, requester: true })}
      eventHandlers={{
        click: (e) => {
          try {
            e?.target?.closePopup?.()
          } catch {
            // noop
          }
          onSelect?.(task)
        },
      }}
    >
      <Popup>
        <MapPopupCard
          kicker="Tu solicitud"
          title={task.title}
          meta={[task.category, statusLabel]}
        >
          {publishedAt ? `Publicada ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(publishedAt))}` : 'Sin fecha'}
        </MapPopupCard>
      </Popup>
    </Marker>
  )
}
