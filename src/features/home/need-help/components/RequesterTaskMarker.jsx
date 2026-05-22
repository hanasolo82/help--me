import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from './NeedHelpMapLayout.module.css'

function buildRequestMarkerIcon({ selected = false, status = 'open' }) {
  const className = selected
    ? `${styles.requesterTaskMarker} ${styles.requesterTaskMarkerActive}`
    : styles.requesterTaskMarker

  return L.divIcon({
    className,
    html: `<span class="${styles.requesterTaskMarkerStatus}">${status === 'open' ? '●' : status}</span>`,
    iconSize: selected ? [52, 52] : [42, 42],
    iconAnchor: selected ? [26, 26] : [21, 21],
  })
}

export default function RequesterTaskMarker({ task, selected = false, onSelect }) {
  if (!task) return null

  return (
    <Marker
      position={[task.lat, task.lng]}
      icon={buildRequestMarkerIcon({ selected, status: task.status })}
      eventHandlers={{
        click: () => onSelect?.(task),
      }}
    >
      <Popup>
        <strong>{task.title}</strong>
        <br />
        {task.category}
        <br />
        {task.status}
      </Popup>
    </Marker>
  )
}
