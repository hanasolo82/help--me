import L from 'leaflet'
import { useEffect } from 'react'
import { Circle, MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { MAP_FILL, MAP_PRIMARY } from '../../../../styles/mapColors'
import MapTileLayer from '../../../../shared/ui/map/MapTileLayer'
import { toFiniteNumber, buildUserIcon } from '../../../../shared/utils/mapHelpers'
import styles from './TaskMap.module.css'

// Centro por defecto: Zaragoza/Delicias aproximado si aun no hay ubicacion del usuario.
const defaultCenter = [41.6523, -0.9019]


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

  useEffect(() => {
    if (!Array.isArray(center) || center.length < 2) return

    const [lat, lng] = center
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return

    map.setView([Number(lat), Number(lng)], map.getZoom(), { animate: true })
  }, [center, map])

  return null
}



function formatTaskDate(value) {
  if (!value) return 'Fecha no indicada'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha no indicada'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatCreatorName(task) {
  return (
    task?.creator_profile?.display_name ||
    task?.creator_profile?.full_name ||
    task?.creator_profile?.username ||
    'Vecino'
  )
}

function MapViewportReporter({ onViewportChange }) {
  useMapEvents({
    moveend(event) {
      if (!onViewportChange) return
      const map = event.target
      const bounds = map.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    },
    zoomend(event) {
      if (!onViewportChange) return
      const map = event.target
      const bounds = map.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    },
    load(event) {
      if (!onViewportChange) return
      const map = event.target
      const bounds = map.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    },
  })

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
  onViewportChange,
}) {
  const userLat = toFiniteNumber(userLocation?.latitude)
  const userLng = toFiniteNumber(userLocation?.longitude)
  const center = userLat !== null && userLng !== null ? [userLat, userLng] : defaultCenter
  const userIcon = buildUserIcon({
    avatarUrl: userAvatarUrl,
    initial: userInitial,
    classNames: {
      image: styles.userMarkerImage,
      fallback: styles.userMarker,
    },
  })
  const safeRadiusKm = Number.isFinite(Number(radiusKm)) ? Math.max(0, Number(radiusKm)) : 10
  const safeTasks = tasks
    .map((task) => ({
      ...task,
      lat: toFiniteNumber(task?.lat),
      lng: toFiniteNumber(task?.lng),
    }))
    .filter((task) => task.lat !== null && task.lng !== null)

  return (
    <div className={styles.mapShell}>
      <MapContainer center={center} zoom={14} scrollWheelZoom className={styles.map}>
        <RecenterMap center={center} />
        <MapViewportReporter onViewportChange={onViewportChange} />
        <MapTileLayer />

        <Circle
          center={center}
          radius={safeRadiusKm * 1000}
          pathOptions={{ color: MAP_PRIMARY, fillColor: MAP_FILL, fillOpacity: 0.16, weight: 3 }}
        />

        <Marker position={center} icon={userIcon}>
          <Popup>
            <strong>Tu ubicacion</strong>
            <br />
            {userLocation?.label || 'Ubicacion aproximada'}
          </Popup>
        </Marker>

        {safeTasks.map((task) => {
          const priceEuros = Number(task.price ?? 0)
          const distance = distances?.[task.id]
          const publishedAt = task.published_at || task.created_at
          const creatorName = formatCreatorName(task)
          return (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createTaskIcon(priceEuros)}
              eventHandlers={{
                click: (e) => {
                  try {
                    e?.target?.closePopup?.()
                  } catch {
                    // noop
                  }
                  onTaskSelect(task.id)
                },
              }}
            >
              <Popup>
                <strong>{task.title}</strong>
                <br />
                {task.category} · {priceEuros} EUR
                <br />
                Publicada {formatTaskDate(publishedAt)}
                <br />
                Creador: {creatorName}
                {Number.isFinite(distance) ? (
                  <>
                    <br />
                    {distance} km
                  </>
                ) : null}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
