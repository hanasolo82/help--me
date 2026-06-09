import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrGetDirectConversation } from '../../../services/chatService'
import TaskCard from '../../tasks/components/TaskCard/TaskCard'
import TaskMap from '../../map/components/TaskMap/TaskMap'
import CategoryFilter from '../../../components/home/CategoryFilter'
import { getLocationLabel } from '../../profile/utils/profileFormatters'
import styles from '../styles/helperHome.module.css'

const DEFAULT_CENTER = { latitude: 41.6523, longitude: -0.9019, label: 'Tu zona' }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatTaskAge(task) {
  const date = new Date(task?.published_at || task?.updated_at || task?.created_at || Date.now())
  if (Number.isNaN(date.getTime())) return 'Hace poco'

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function formatTaskLocation(task) {
  return task?.zone || task?.location_label || task?.location || 'Zona no indicada'
}

function buildCenter(location, profile) {
  const latitude = Number(location?.lat ?? profile?.lat ?? DEFAULT_CENTER.latitude)
  const longitude = Number(location?.lng ?? profile?.lng ?? DEFAULT_CENTER.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return DEFAULT_CENTER
  }

  return {
    latitude,
    longitude,
    label: location?.label || getLocationLabel(profile) || DEFAULT_CENTER.label,
  }
}

function isWithinBounds(task, bounds) {
  if (!bounds) return true

  const lat = Number(task?.lat)
  const lng = Number(task?.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }

  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  )
}

function getCompatibilityScore(task, profile, distanceKm) {
  if (!task) return 0

  const distanceValue = Number(distanceKm)
  const distanceScale = 50
  const distanceScore = Number.isFinite(distanceValue)
    ? clamp(Math.round(44 - (distanceValue / distanceScale) * 44), 0, 44)
    : 16

  const freshnessDate = new Date(task.published_at || task.created_at || Date.now())
  const freshnessHours = Math.max(0, (Date.now() - freshnessDate.getTime()) / 3600000)
  const freshnessScore = freshnessHours <= 12 ? 28 : freshnessHours <= 24 ? 22 : freshnessHours <= 72 ? 14 : 6
  const priceScore = Number(task.price ?? 0) > 0 ? 16 : 8
  const activeScore = profile?.availability_enabled === false ? -8 : 12

  return clamp(distanceScore + freshnessScore + priceScore + activeScore, 0, 100)
}

function buildMapEntries(entries = [], currentUserId, profile) {
  return entries
    .map((entry) => {
      const task = entry?.task || entry
      if (!task || task.status !== 'open' || task.created_by === currentUserId) return null

      const distanceValue = Number(entry?.distance ?? entry?.distance_km ?? null)
      const distance = Number.isFinite(distanceValue) ? distanceValue : null
      const compatibilityScore = Number(entry?.compatibilityScore ?? getCompatibilityScore(task, profile, distance))

      return {
        task,
        distance,
        compatibilityScore,
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftDistance = Number(left.distance)
      const rightDistance = Number(right.distance)
      const hasLeftDistance = Number.isFinite(leftDistance)
      const hasRightDistance = Number.isFinite(rightDistance)

      if (hasLeftDistance && hasRightDistance && leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      if (hasLeftDistance !== hasRightDistance) {
        return hasLeftDistance ? -1 : 1
      }

      const leftDate = new Date(left.task.published_at || left.task.updated_at || left.task.created_at || 0).getTime()
      const rightDate = new Date(right.task.published_at || right.task.updated_at || right.task.created_at || 0).getTime()
      if (leftDate !== rightDate) {
        return rightDate - leftDate
      }

      return String(left.task.id || '').localeCompare(String(right.task.id || ''))
    })
}

export default function HelperHome({ profile, helperHomeProps = {} }) {
  const navigate = useNavigate()
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)

  const center = buildCenter(helperHomeProps.mapLocation, profile)
  const allMapEntries = useMemo(
    () => buildMapEntries(helperHomeProps.visibleTasks || [], helperHomeProps.currentUserId, profile),
    [helperHomeProps.currentUserId, helperHomeProps.visibleTasks, profile],
  )

  const mapEntries = useMemo(
    () => allMapEntries.filter((entry) => isWithinBounds(entry.task, mapBounds)),
    [allMapEntries, mapBounds],
  )

  const opportunityDistances = useMemo(
    () =>
      mapEntries.reduce((acc, entry) => {
        if (Number.isFinite(Number(entry.distance))) {
          acc[entry.task.id] = entry.distance
        }
        return acc
      }, {}),
    [mapEntries],
  )

  const resolvedSelectedTaskId =
    mapEntries.length === 0
      ? null
      : mapEntries.some((entry) => entry.task.id === selectedTaskId)
        ? selectedTaskId
        : mapEntries[0].task.id

  const selectedEntry = mapEntries.find((entry) => entry.task.id === resolvedSelectedTaskId) || mapEntries[0] || null
  const selectedTask = selectedEntry?.task || null
  const selectedDistance = selectedEntry?.distance ?? null
  const openTaskCount = mapEntries.length
  const compatibilityAverage = mapEntries.length
    ? Math.round(mapEntries.reduce((sum, entry) => sum + entry.compatibilityScore, 0) / mapEntries.length)
    : 0
  const mapTasks = mapEntries.map((entry) => entry.task)
  const canContact = Boolean(selectedTask && selectedTask.status === 'open' && selectedTask.created_by !== helperHomeProps.currentUserId)
  const locationSource =
    helperHomeProps.locationSource === 'current'
      ? 'current'
      : helperHomeProps.locationSource === 'search'
        ? 'search'
        : 'profile'
  const shouldFitTasksOnLoad = locationSource !== 'search'

  async function handleContact(task) {
    if (!task || task.status !== 'open' || task.created_by === helperHomeProps.currentUserId) {
      return
    }

    try {
      const conversationId = await createOrGetDirectConversation(task.created_by)
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      console.error('[HelperHome] could not open contact chat', error)
    }
  }

  function handleOpenTask(task) {
    navigate(`/task/${task.id}`)
  }

  return (
    <section className={styles.home}>
      <section className={styles.mapWorkspace} aria-label="Mapa de solicitudes activas">
        <div className={styles.mapPane}>
          <TaskMap
            tasks={mapTasks}
            userLocation={center}
            distances={opportunityDistances}
            showUserWaypoint={false}
            recenterOnCenter
            centerSource={locationSource}
            fitTasksOnLoad={shouldFitTasksOnLoad}
            fitTasksKey={locationSource}
            onViewportChange={setMapBounds}
            onTaskSelect={(taskId) => {
              const nextTask = mapEntries.find((entry) => entry.task.id === taskId)
              if (nextTask) {
                setSelectedTaskId(nextTask.task.id)
              }
            }}
          />
        </div>

        <aside className={styles.mapDrawer}>
          <section className={styles.columnPanel} aria-label="Filtros del mapa">
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Buscar tareas</p>
                <h3>Solicitudes publicadas</h3>
                <p className="muted">El mapa se mantiene fijo; filtra por actividad y revisa el detalle aquí.</p>
              </div>
            </div>

            <div className={styles.filtersBar}>
              <div className={styles.filtersInner}>
                <CategoryFilter
                  category={helperHomeProps.category}
                  onChange={helperHomeProps.onCategoryChange}
                  options={helperHomeProps.categories || []}
                />
              </div>

              <div className={styles.filtersCount}>
                <strong>{openTaskCount} solicitudes</strong>
                <span>{allMapEntries.length} con estos filtros · {compatibilityAverage}% match medio</span>
              </div>
            </div>
          </section>

          <section className={styles.columnPanel} aria-label="Detalle de solicitud">
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Selección</p>
                <h3>Solicitud seleccionada</h3>
                <p className="muted">
                  {selectedTask
                    ? 'Revisa lo esencial y abre el detalle completo cuando quieras actuar.'
                    : 'Selecciona un marcador para cargar su resumen.'}
                </p>
              </div>
            </div>

            {selectedTask ? (
              <>
                <div className={styles.selectedTaskSummary}>
                  <strong>{selectedTask.title}</strong>
                  <p>{selectedTask.category} · {formatTaskLocation(selectedTask)}</p>
                  <span>
                    {Number.isFinite(Number(selectedDistance)) ? `${Number(selectedDistance).toFixed(1)} km` : 'Distancia no disponible'}
                    {' · '}
                    {formatTaskAge(selectedTask)}
                  </span>
                </div>

                <div key={selectedTask.id} className={styles.selectionShell}>
                  <TaskCard
                    task={selectedTask}
                    distanceKm={selectedDistance}
                    showDistance
                    expanded
                    primaryActionLabel="Ver solicitud"
                    primaryActionVariant="primary"
                    onPrimaryAction={() => handleOpenTask(selectedTask)}
                    secondaryActionLabel="Contactar"
                    secondaryActionVariant="secondary"
                    secondaryActionDisabled={!canContact}
                    onSecondaryAction={() => handleContact(selectedTask)}
                  />
                </div>
              </>
            ) : (
              <div className={styles.empty}>
                <strong>No hay solicitudes visibles todavía</strong>
                <p>Cuando una solicitud abierta entre en la parte visible del mapa, aparecerá aquí.</p>
                <span className={styles.emptyNote}>Mueve el mapa o busca otra zona desde el header.</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </section>
  )
}
