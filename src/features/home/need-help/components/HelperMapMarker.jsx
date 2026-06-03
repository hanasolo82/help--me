import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from './NeedHelpMapLayout.module.css'

function toFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function buildMarkerIcon({ selected = false, avatarUrl, initial }) {
  const className = selected ? `${styles.helperMarker} ${styles.helperMarkerActive}` : styles.helperMarker
  const content = avatarUrl
    ? `<img class="${styles.helperMarkerAvatar}" src="${avatarUrl}" alt="" />`
    : `<span class="${styles.helperMarkerFallback}">${initial || 'V'}</span>`

  return L.divIcon({
    className,
    html: content,
    iconSize: selected ? [54, 54] : [42, 42],
    iconAnchor: selected ? [27, 27] : [21, 21],
  })
}

export default function HelperMapMarker({ helper, selected = false, onSelect }) {
  if (!helper) return null

  const lat = toFiniteNumber(helper.lat)
  const lng = toFiniteNumber(helper.lng)

  if (lat === null || lng === null) {
    return null
  }

  const avatarUrl = helper.map_avatar_url || helper.avatar_url || null
  const initial = String(helper.display_name || helper.full_name || helper.username || 'V').charAt(0).toUpperCase()

  return (
    <Marker
      position={[lat, lng]}
      icon={buildMarkerIcon({ selected, avatarUrl, initial })}
      eventHandlers={{
        click: () => onSelect?.(helper),
      }}
    >
      <Popup>
        <strong>{helper.display_name || helper.full_name || helper.username || 'Vecino'}</strong>
        <br />
        {helper.location_label || helper.city || helper.neighborhood || 'Zona cercana'}
        <br />
        {helper.availability_enabled === false ? 'No disponible' : 'Disponible'}
        <br />
        {Number.isFinite(Number(helper.distance_km)) ? `${Number(helper.distance_km).toFixed(1)} km` : 'Cerca de ti'}
        <br />
        {helper.skills?.slice(0, 3).map((skill) => skill.name).join(' · ') || 'Ayuda general'}
      </Popup>
    </Marker>
  )
}
