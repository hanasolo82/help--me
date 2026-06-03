import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from './NeedHelpMapLayout.module.css'

function buildRequestMarkerIcon({ selected = false, status = 'open' }) {
  const className = selected
    ? `${styles.requesterTaskMarker} ${styles.requesterTaskMarkerActive}`
    : styles.requesterTaskMarker

  return L.divIcon({
    className,
    html: `<span class="${styles.requesterTaskMarkerStatus}">${status === 'open' ? 'Tu' : status}</span>`,
    iconSize: selected ? [52, 52] : [42, 42],
    iconAnchor: selected ? [26, 26] : [21, 21],
  })
}

export default function RequesterTaskMarker({ task, selected = false, onSelect }) {
  if (!task) return null

  const publishedAt = task.published_at || task.created_at

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={buildRequestMarkerIcon({ selected, status: task.status })}
      eventHandlers={{
        click: () => onSelect?.(task),
      }}
    >
      <Popup>
        <strong>Tu solicitud</strong>
        <br />
        {task.title}
        <br />
        {task.category} · {task.status}
        <br />
        {publishedAt ? `Publicada ${new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(publishedAt))}` : 'Sin fecha'}
      </Popup>
    </Marker>
  )
}
