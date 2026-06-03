import L from 'leaflet'
import { Marker, Popup } from 'react-leaflet'
import styles from '../../profile/styles/profileNetwork.module.css'
import { getAvatarInitial } from '../../../utils/avatar'
import { toFiniteNumber } from '../../../shared/utils/mapHelpers'

function buildHelperIcon(helper, compact = false) {
  const className = compact ? styles.helperMarkerCompact : styles.helperMarker
  const avatarUrl = helper?.map_avatar_url || helper?.avatar_url
  const initial = getAvatarInitial(helper?.display_name || helper?.full_name || helper?.username || 'helpMe')
  const content = avatarUrl
    ? `<img class="${styles.helperMarkerAvatar}" src="${avatarUrl}" alt="" />`
    : `<span class="${styles.helperMarkerFallback}">${initial}</span>`

  return L.divIcon({
    className,
    html: content,
    iconSize: compact ? [39, 39] : [48, 48],
    iconAnchor: compact ? [19, 19] : [24, 24],
  })
}

export default function HelperMarker({ helper, onSelect }) {
  if (!helper) return null

  const lat = toFiniteNumber(helper.lat)
  const lng = toFiniteNumber(helper.lng)

  if (lat === null || lng === null) {
    return null
  }

  return (
    <Marker
      position={[lat, lng]}
      icon={buildHelperIcon(helper)}
      eventHandlers={{
        click: (e) => {
          try {
            e?.target?.closePopup?.()
          } catch {
            // noop
          }
          onSelect?.(helper)
        },
      }}
    >
      <Popup>
        <strong>{helper.display_name || helper.full_name || helper.username || 'Vecino'}</strong>
        <br />
        {Number(helper.rating ?? 0).toFixed(1)} · {helper.city || helper.neighborhood || 'Zona cercana'}
        <br />
        {helper.skills?.slice(0, 3).map((skill) => skill.name).join(' · ')}
      </Popup>
    </Marker>
  )
}
