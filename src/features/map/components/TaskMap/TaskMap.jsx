import { useEffect, useLayoutEffect, useRef } from 'react'
import { MapContainer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import MapTileLayer from '../../../../shared/ui/map/MapTileLayer'
import MapAutoResize from '../../../../shared/ui/map/MapAutoResize'
import MapPopupCard from '../../../../shared/ui/map/MapPopupCard'
import { createTaskMarkerIcon, createUserMarkerIcon, getTaskStatusLabel } from '../../../../shared/ui/map/mapMarkerIcons'
import { getTaskCategoryLabel } from '../../../tasks/categories/taskCategories'
import { getTaskUrgency } from '../../../tasks/urgency/taskUrgency'
import { toFiniteNumber } from '../../../../shared/utils/mapHelpers'
import styles from './TaskMap.module.css'

// Centro por defecto: Zaragoza/Delicias aproximado si aun no hay ubicacion del usuario.
const defaultCenter = [41.6523, -0.9019]
const fallbackZoom = 15
const minimumMapZoom = 10

function normalizeZoom(zoom, fallback = fallbackZoom) {
  const nextZoom = Number(zoom)
  return Number.isFinite(nextZoom) ? nextZoom : fallback
}

function hasValidCenter(center) {
  return (
    Array.isArray(center) &&
    center.length >= 2 &&
    Number.isFinite(Number(center[0])) &&
    Number.isFinite(Number(center[1]))
  )
}

function isMapMounted(map) {
  return Boolean(map?._loaded && map?._mapPane)
}

function stopMapAnimationIfMounted(map) {
  try {
    if (isMapMounted(map)) {
      map.stop()
    }
  } catch {
    // Leaflet puede haber desmontado sus panes internos durante el cambio de vista.
  }
}

function RecenterMap({ center, centerSource = 'profile', zoom = fallbackZoom }) {
  const map = useMap()
  const appliedCenterKeyRef = useRef(null)

  useLayoutEffect(() => {
    if (!hasValidCenter(center)) return

    const [lat, lng] = center

    const nextCenter = [Number(lat), Number(lng)]
    const nextZoom = normalizeZoom(zoom)
    const nextCenterKey = `${centerSource}:${nextCenter[0].toFixed(5)}:${nextCenter[1].toFixed(5)}:${nextZoom}`

    if (appliedCenterKeyRef.current === nextCenterKey) {
      return
    }

    appliedCenterKeyRef.current = nextCenterKey
    let cancelled = false
    let frameId = null
    let timeoutId = null

    const applyCenter = () => {
      if (cancelled || !isMapMounted(map)) return
      stopMapAnimationIfMounted(map)
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

function FitMapOnce({ tasks, around = null }) {
  const map = useMap()
  const fittedRef = useRef(false)

  useEffect(() => {
    const points = tasks
      .map((task) => [task.lat, task.lng])
      .filter(([lat, lng]) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)))

    if (fittedRef.current) return
    if (points.length === 0) return

    // Solo encuadra tareas razonablemente cerca del usuario (~15 km): encuadrar
    // TODAS alejaba el zoom inicial hasta ver media España si había una tarea
    // suelta en otra provincia. Sin tareas cercanas, el mapa se queda donde el
    // usuario (RecenterMap ya lo centra en su zona).
    const anchorLat = Number(around?.[0])
    const anchorLng = Number(around?.[1])
    const hasAnchor = Number.isFinite(anchorLat) && Number.isFinite(anchorLng)
    const nearbyPoints = hasAnchor
      ? points.filter(([lat, lng]) => Math.abs(lat - anchorLat) <= 0.13 && Math.abs(lng - anchorLng) <= 0.17)
      : points

    fittedRef.current = true

    if (nearbyPoints.length === 0) return

    const boundsPoints = hasAnchor ? [...nearbyPoints, [anchorLat, anchorLng]] : nearbyPoints
    const readableCenter = hasAnchor ? [anchorLat, anchorLng] : boundsPoints[0]
    let frameId = null

    const keepReadableZoom = () => {
      if (map.getZoom() < minimumMapZoom) {
        map.setView(readableCenter, fallbackZoom, { animate: false })
      }
    }

    if (boundsPoints.length > 1) {
      map.fitBounds(boundsPoints, { padding: [42, 42], maxZoom: fallbackZoom, animate: false })
      keepReadableZoom()
      frameId = window.requestAnimationFrame(keepReadableZoom)
    } else {
      map.setView(boundsPoints[0], fallbackZoom, { animate: false })
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [around, map, tasks])

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
  selectedTaskId = null,
  renderTaskMarker = null,
  showUserWaypoint = true,
  recenterOnCenter = true,
  centerSource = 'profile',
  recenterZoom = 15,
  fitTasksOnLoad = false,
  fitTasksKey = 'initial',
}) {
  const userLat = toFiniteNumber(userLocation?.latitude ?? userLocation?.lat)
  const userLng = toFiniteNumber(userLocation?.longitude ?? userLocation?.lng)
  const center = userLat !== null && userLng !== null ? [userLat, userLng] : defaultCenter
  const initialZoom = normalizeZoom(recenterZoom)
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
      <MapContainer
        center={center}
        zoom={initialZoom}
        minZoom={minimumMapZoom}
        scrollWheelZoom
        className={styles.map}
        whenReady={({ target: map }) => {
          map.invalidateSize({ animate: false })
          map.setView(center, initialZoom, { animate: false })
        }}
      >
        {recenterOnCenter ? (
          <RecenterMap center={center} centerSource={centerSource} zoom={recenterZoom} />
        ) : null}
        {fitTasksOnLoad ? <FitMapOnce key={fitTasksKey} tasks={safeTasks} around={center} /> : null}
        <MapViewportReporter onViewportChange={onViewportChange} />
        <MapAutoResize />
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
          // Marcador personalizado opcional (p. ej. el waypoint + popup del helper).
          // Si no se pasa, se usa la pastilla de precio por defecto.
          if (renderTaskMarker) {
            return renderTaskMarker(task, { selected: task.id === selectedTaskId })
          }

          const priceEuros = Number(task.price ?? 0)
          const distance = distances?.[task.id]
          const publishedAt = task.published_at || task.created_at
          const creatorName = formatCreatorName(task)
          const locationLabel = task.location_label || task.zone || task.location
          const statusLabel = getTaskStatusLabel(task)
          const categoryLabel = getTaskCategoryLabel(task.category)
          const urgency = getTaskUrgency(task)
          return (
            <Marker
              key={task.id}
              position={[task.lat, task.lng]}
              icon={createTaskMarkerIcon({ task, selected: task.id === selectedTaskId })}
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
                  kicker={urgency?.label || statusLabel}
                  title={task.title}
                  meta={[
                    categoryLabel,
                    `${priceEuros} EUR`,
                    locationLabel,
                    Number.isFinite(distance) ? `${distance} km` : null,
                    urgency?.detail || null,
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
