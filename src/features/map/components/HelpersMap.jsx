import { Circle, MapContainer, useMap } from 'react-leaflet'
import HelperMarker from './HelperMarker'
import { MAP_FILL, MAP_PRIMARY } from '../../../styles/mapColors'
import MapTileLayer from '../../../shared/ui/map/MapTileLayer'
import styles from '../../profile/styles/profileNetwork.module.css'

const defaultCenter = [41.6523, -0.9019]

function RecenterMap({ center }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

function buildCenter(center) {
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    return defaultCenter
  }

  return [center.lat, center.lng]
}

export default function HelpersMap({
  helpers = [],
  center = null,
  radiusKm = 10,
  onHelperSelect,
  userLabel = 'Tu zona',
}) {
  const resolvedCenter = buildCenter(center)

  return (
    <div className={styles.mapShell}>
      <MapContainer center={resolvedCenter} zoom={14} scrollWheelZoom className={styles.map}>
        <RecenterMap center={resolvedCenter} />
        <MapTileLayer />

        <Circle
          center={resolvedCenter}
          radius={radiusKm * 1000}
          pathOptions={{ color: MAP_PRIMARY, fillColor: MAP_FILL, fillOpacity: 0.16, weight: 3 }}
        />

        {helpers.map((helper) => (
          <HelperMarker key={helper.id} helper={helper} onSelect={onHelperSelect} />
        ))}
      </MapContainer>
      <div className={styles.highlightCard} style={{ margin: '0.75rem' }}>
        <strong>{userLabel}</strong>
        <p className="muted">Helpers cercanos según disponibilidad, confianza y distancia aproximada.</p>
      </div>
    </div>
  )
}
