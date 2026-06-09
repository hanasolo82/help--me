import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from './NeedHelpMapLayout.module.css'

const STATUS_COPY = {
  open: 'Activa',
  assigned: 'Pendiente de confirmación',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  draft: 'Borrador',
}

function buildRequestMarkerIcon({ selected = false }) {
  const className = selected
    ? `${styles.requesterTaskMarker} ${styles.requesterTaskMarkerActive}`
    : styles.requesterTaskMarker

  return L.divIcon({
    className,
    html: `
      <span class="${styles.requesterTaskMarkerIcon}" aria-hidden="true">✓</span>
      <span class="${styles.requesterTaskMarkerLabel}">Tu tarea</span>
    `,
    iconSize: selected ? [76, 48] : [70, 44],
    iconAnchor: selected ? [38, 44] : [35, 40],
  })
}

export default function RequesterTaskMarker({ task, selected = false, onSelect }) {
  if (!task) return null

  const publishedAt = task.published_at || task.created_at
  const statusLabel = STATUS_COPY[task.status] || task.status

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={buildRequestMarkerIcon({ selected })}
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
        <br />
        {publishedAt ? `Publicada ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(publishedAt))}` : 'Sin fecha'}
      </Popup>
    </Marker>
  )
}
