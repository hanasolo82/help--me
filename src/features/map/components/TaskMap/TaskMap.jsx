import { useEffect, useLayoutEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MapTileLayer from '../../../../shared/ui/map/MapTileLayer'
import MapPopupCard from '../../../../shared/ui/map/MapPopupCard'
import { createTaskMarkerIcon, createUserMarkerIcon, getTaskStatusLabel } from '../../../../shared/ui/map/mapMarkerIcons'
import { getTaskCategoryLabel } from '../../../tasks/categories/taskCategories'
import { toFiniteNumber } from '../../../../shared/utils/mapHelpers'
import styles from './TaskMap.module.css'

// Centro por defecto: Zaragoza/Delicias aproximado si aun no hay ubicacion del usuario.
const defaultCenter = [41.6523, -0.9019]

function RecenterMap({ center, centerSource = 'profile', zoom = 14 }) {
  const map = useMap()
  const appliedCenterKeyRef = useRef(null)

  useLayoutEffect(() => {
    if (!Array.isArray(center) || center.length < 2) return

    const [lat, lng] = center
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return

    const nextCenter = [Number(lat), Number(lng)]
    const nextZoom = Number.isFinite(Number(zoom)) ? Number(zoom) : 14
    const nextCenterKey = `${centerSource}:${nextCenter[0].toFixed(5)}:${nextCenter[1].toFixed(5)}:${nextZoom}`

    if (appliedCenterKeyRef.current === nextCenterKey) {
      return
    }

    appliedCenterKeyRef.current = nextCenterKey
    let cancelled = false
    let frameId = null
    let timeoutId = null

    const applyCenter = () => {
      if (cancelled) return
      map.stop()
      map.invalidateSize({ animate: false })
      map.setView(nextCenter, nextZoom, { animate: false })
    }

    const applyWithLayoutPass = () => {
      applyCenter()
      frameId = window.requestAnimationFrame(applyCenter)

      if (centerSource === 'search') {
        timeoutId = window.setTimeout(applyCenter, 120)
      }
    }

    map.whenReady(applyWithLayoutPass)

    return () => {
      cancelled = true

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [center, centerSource, map, zoom])

  return null
}

function FitMapOnce({ tasks }) {
  const map = useMap()
  const fittedRef = useRef(false)

  useEffect(() => {
    const points = tasks
      .map((task) => [task.lat, task.lng])
      .filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)))

    if (fittedRef.current) return
    if (points.length === 0) return

    if (points.length > 1) {
      map.fitBounds(points, { padding: [42, 42], maxZoom: 14 })
    } else {
      map.setView(points[0], 14)
    }

    fittedRef.current = true
  }, [map, tasks])

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
  const map = useMap()

  useEffect(() => {
    if (!onViewportChange) return undefined

    let cancelled = false
    let frameId = null

    function reportBounds() {
      if (cancelled) return

      const bounds = map.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }

    map.whenReady(() => {
      queueMicrotask(reportBounds)
      frameId = window.requestAnimationFrame(reportBounds)
    })

    return () => {
      cancelled = true

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [map, onViewportChange])

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
  onTaskSelect,
  distances,
  userAvatarUrl,
  userInitial,
  onViewportChange,
  showUserWaypoint = true,
  recenterOnCenter = true,
  centerSource = 'profile',
  recenterZoom = 14,
  fitTasksOnLoad = false,
  fitTasksKey = 'initial',
}) {
  const userLat = toFiniteNumber(userLocation?.latitude)
  const userLng = toFiniteNumber(userLocation?.longitude)
  const center = userLat !== null && userLng !== null ? [userLat, userLng] : defaultCenter
  const userIcon = createUserMarkerIcon({
    avatarUrl: userAvatarUrl,
    initial: userInitial,
  })
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
        {recenterOnCenter ? (
          <RecenterMap center={center} centerSource={centerSource} zoom={recenterZoom} />
        ) : null}
        {fitTasksOnLoad ? <FitMapOnce key={fitTasksKey} tasks={safeTasks} /> : null}
        <MapViewportReporter onViewportChange={onViewportChange} />
        <MapTileLayer />

        {showUserWaypoint ? (
          <Marker position={center} icon={userIcon}>
            <Popup>
              <MapPopupCard
                kicker="Tu posicion"
                title={userLocation?.label || 'Ubicacion aproximada'}
                meta={['Referencia del mapa']}
              />
            </Popup>
          </Marker>
        ) : null}

        {safeTasks.map((task) => {
          const priceEuros = Number(task.price ?? 0)
          const distance = distances?.[task.id]
          const publishedAt = task.published_at || task.created_at
          const creatorName = formatCreatorName(task)
          const locationLabel = task.location_label || task.zone || task.location
          const statusLabel = getTaskStatusLabel(task)
          const categoryLabel = getTaskCategoryLabel(task.category)
          return (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createTaskMarkerIcon({ task })}
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
                <MapPopupCard
                  kicker={statusLabel}
                  title={task.title}
                  meta={[
                    categoryLabel,
                    `${priceEuros} EUR`,
                    locationLabel,
                    Number.isFinite(distance) ? `${distance} km` : null,
                  ]}
                >
                  {`Publicada ${formatTaskDate(publishedAt)}. Creador: ${creatorName}.`}
                </MapPopupCard>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
