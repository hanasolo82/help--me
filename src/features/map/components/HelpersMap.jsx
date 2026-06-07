import { useEffect } from 'react'
import { MapContainer, useMap } from 'react-leaflet'
import HelperMarker from './HelperMarker'
import MapTileLayer from '../../../shared/ui/map/MapTileLayer'
import { toFiniteNumber } from '../../../shared/utils/mapHelpers'
import styles from '../../profile/styles/profileNetwork.module.css'

const defaultCenter = [41.6523, -0.9019]

function RecenterMap({ center }) {
  const map = useMap()

  useEffect(() => {
    if (!Array.isArray(center) || center.length < 2) return

    const [lat, lng] = center
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return

    map.setView([Number(lat), Number(lng)], map.getZoom(), { animate: true })
  }, [center, map])

  return null
}



function buildCenter(center) {
  const lat = toFiniteNumber(center?.lat)
  const lng = toFiniteNumber(center?.lng)

  if (lat === null || lng === null) {
    return defaultCenter
  }

  return [lat, lng]
}

export default function HelpersMap({
  helpers = [],
  center = null,
  onHelperSelect,
  userLabel = 'Tu zona',
}) {
  const resolvedCenter = buildCenter(center)
  const safeHelpers = helpers
    .map((helper) => ({
      ...helper,
      lat: toFiniteNumber(helper?.lat),
      lng: toFiniteNumber(helper?.lng),
    }))
    .filter((helper) => helper.lat !== null && helper.lng !== null)

  return (
    <div className={styles.mapShell}>
      <MapContainer center={resolvedCenter} zoom={14} scrollWheelZoom className={styles.map}>
        <RecenterMap center={resolvedCenter} />
        <MapTileLayer />

        {safeHelpers.map((helper) => (
          <HelperMarker key={helper.id} helper={helper} onSelect={onHelperSelect} />
        ))}
      </MapContainer>
      <div className={styles.highlightCard} style={{ margin: '0.75rem' }}>
        <strong>{userLabel}</strong>
        <p className="muted">Helpers disponibles según actividad y zona visible del mapa.</p>
      </div>
    </div>
  )
}
