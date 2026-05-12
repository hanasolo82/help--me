import L from 'leaflet'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import styles from './TaskMap.module.css'

const defaultCenter = [41.6523, -0.9019]

const userIcon = L.divIcon({
  className: styles.userMarker,
  html: '<span>Tu</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
})

function createTaskIcon(price) {
  return L.divIcon({
    className: styles.taskMarker,
    html: `<span>${price}€</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

function RecenterMap({ center }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

export default function TaskMap({ tasks, userLocation, radiusKm, onTaskSelect }) {
  const center = userLocation ? [userLocation.latitude, userLocation.longitude] : defaultCenter

  return (
    <div className={styles.mapShell}>
      <MapContainer center={center} zoom={14} scrollWheelZoom className={styles.map}>
        <RecenterMap center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#1804c9', fillColor: '#ffd300', fillOpacity: 0.16, weight: 3 }}
        />

        <Marker position={center} icon={userIcon}>
          <Popup>
            <strong>Tu ubicacion</strong>
            <br />
            {userLocation?.label || 'Zaragoza · Delicias'}
          </Popup>
        </Marker>

        {tasks.map((task) => (
          <Marker
            key={task.id}
            position={[task.location.latitude, task.location.longitude]}
            icon={createTaskIcon(task.price)}
            eventHandlers={{
              click: () => onTaskSelect(task.id),
            }}
          >
            <Popup>
              <strong>{task.title}</strong>
              <br />
              {task.user?.name} · {task.distance} km
              <br />
              {task.price} EUR · {task.category}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
