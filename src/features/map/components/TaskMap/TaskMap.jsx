import L from 'leaflet'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import styles from './TaskMap.module.css'

// Centro por defecto: Zaragoza/Delicias aproximado si aun no hay ubicacion del usuario.
const defaultCenter = [41.6523, -0.9019]

function buildUserIcon({ avatarUrl, initial }) {
  // Cuando hay imagen, el marcador es solo la foto: sin caja, sin borde, sin sombra.
  if (avatarUrl) {
    return L.divIcon({
      className: styles.userMarkerImage,
      html: `<img src="${avatarUrl}" alt="" />`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    })
  }

  return L.divIcon({
    className: styles.userMarker,
    html: `<span>${initial || 'Tu'}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

function createTaskIcon(priceEuros) {
  return L.divIcon({
    className: styles.taskMarker,
    html: `<span>${priceEuros}€</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

function RecenterMap({ center }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

// Mapa con OpenStreetMap. Las tareas vienen con lat/lng y price (euros) directos del schema.
// El marcador del usuario usa el map_avatar_url del profile si esta disponible.
export default function TaskMap({
  tasks,
  userLocation,
  radiusKm,
  onTaskSelect,
  distances,
  userAvatarUrl,
  userInitial,
}) {
  const center = userLocation ? [userLocation.latitude, userLocation.longitude] : defaultCenter
  const userIcon = buildUserIcon({ avatarUrl: userAvatarUrl, initial: userInitial })

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
            {userLocation?.label || 'Ubicacion aproximada'}
          </Popup>
        </Marker>

        {tasks.map((task) => {
          const priceEuros = Number(task.price ?? 0)
          const distance = distances?.[task.id]
          return (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createTaskIcon(priceEuros)}
              eventHandlers={{
                click: () => onTaskSelect(task.id),
              }}
            >
              <Popup>
                <strong>{task.title}</strong>
                {Number.isFinite(distance) ? <><br />{distance} km</> : null}
                <br />
                {priceEuros} EUR · {task.category}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
