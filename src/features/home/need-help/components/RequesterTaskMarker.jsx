import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from './NeedHelpMapLayout.module.css'

const STATUS_LABELS = {
  open: 'Tu',
  assigned: 'Revisar',
  in_progress: 'Curso',
  completed: 'Fin',
  closed: 'Fin',
  cancelled: 'Off',
  draft: 'Draft',
}

const STATUS_COPY = {
  open: 'Activa',
  assigned: 'Pendiente de confirmación',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  draft: 'Borrador',
}

function buildRequestMarkerIcon({ selected = false, status = 'open' }) {
  const className = selected
    ? `${styles.requesterTaskMarker} ${styles.requesterTaskMarkerActive}`
    : styles.requesterTaskMarker

  return L.divIcon({
    className,
    html: `<span class="${styles.requesterTaskMarkerStatus}">${STATUS_LABELS[status] || 'Tu'}</span>`,
    iconSize: selected ? [52, 52] : [42, 42],
    iconAnchor: selected ? [26, 26] : [21, 21],
  })
}

export default function RequesterTaskMarker({ task, selected = false, onSelect }) {
  if (!task) return null

  const publishedAt = task.published_at || task.created_at
  const locationLabel = task.location_label || task.zone || task.location || ''
  const statusLabel = STATUS_COPY[task.status] || task.status

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={buildRequestMarkerIcon({ selected, status: task.status })}
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
        <strong>Tu solicitud</strong>
        <br />
        {task.title}
        <br />
        {task.category} · {statusLabel}
        {locationLabel ? (
          <>
            <br />
            {locationLabel}
          </>
        ) : null}
        <br />
        {publishedAt ? `Publicada ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(publishedAt))}` : 'Sin fecha'}
      </Popup>
    </Marker>
  )
}
