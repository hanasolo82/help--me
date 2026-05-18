import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet'
import HelperMarker from './HelperMarker'
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={resolvedCenter}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#1804c9', fillColor: '#ffd300', fillOpacity: 0.16, weight: 3 }}
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
