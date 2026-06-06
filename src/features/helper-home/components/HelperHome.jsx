import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrGetDirectConversation } from '../../../services/chatService'
import TaskCard from '../../tasks/components/TaskCard/TaskCard'
import TaskMap from '../../map/components/TaskMap/TaskMap'
import CategoryFilter from '../../../components/home/CategoryFilter'
import RadiusFilter from '../../../components/home/RadiusFilter'
import { getHelperStatusCopy, getLocationLabel } from '../../profile/utils/profileFormatters'
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

function getCompatibilityScore(task, profile, distanceKm, radiusKm) {
  if (!task) return 0

  const distanceValue = Number(distanceKm)
  const safeRadius = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0 ? Number(radiusKm) : 10
  const distanceScore = Number.isFinite(distanceValue)
    ? clamp(Math.round(44 - (distanceValue / safeRadius) * 44), 0, 44)
    : 16

  const freshnessDate = new Date(task.published_at || task.created_at || Date.now())
  const freshnessHours = Math.max(0, (Date.now() - freshnessDate.getTime()) / 3600000)
  const freshnessScore = freshnessHours <= 12 ? 28 : freshnessHours <= 24 ? 22 : freshnessHours <= 72 ? 14 : 6
  const priceScore = Number(task.price ?? 0) > 0 ? 16 : 8
  const activeScore = profile?.availability_enabled === false ? -8 : 12

  return clamp(distanceScore + freshnessScore + priceScore + activeScore, 0, 100)
}

function buildMapEntries(entries = [], currentUserId, profile, radiusKm) {
  return entries
    .map((entry) => {
      const task = entry?.task || entry
      if (!task || task.status !== 'open' || task.created_by === currentUserId) return null

      const distanceValue = Number(entry?.distance ?? entry?.distance_km ?? null)
      const distance = Number.isFinite(distanceValue) ? distanceValue : null
      const compatibilityScore = Number(entry?.compatibilityScore ?? getCompatibilityScore(task, profile, distance, radiusKm))

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

  const helperStatusCopy = getHelperStatusCopy(profile)
  const center = buildCenter(helperHomeProps.mapLocation, profile)
  const radiusKm = Number.isFinite(Number(helperHomeProps.radiusKm))
    ? Number(helperHomeProps.radiusKm)
    : Number.isFinite(Number(helperHomeProps.radius))
      ? Number(helperHomeProps.radius)
      : Number(profile?.search_radius_km) || 10

  const mapEntries = useMemo(
    () => buildMapEntries(helperHomeProps.visibleTasks || [], helperHomeProps.currentUserId, profile, radiusKm),
    [helperHomeProps.currentUserId, helperHomeProps.visibleTasks, profile, radiusKm],
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
  const hasCurrentLocation = Boolean(helperHomeProps.currentLocation)
  const hasProfileLocation = Boolean(helperHomeProps.profileLocation)
  const locationSourceLabel =
    locationSource === 'current'
      ? 'Ubicación actual'
      : locationSource === 'search'
        ? 'Zona buscada'
        : 'Zona guardada'
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

  function handleOpenSettings() {
    if (helperHomeProps.onOpenSettings) {
      helperHomeProps.onOpenSettings()
      return
    }

    navigate('/settings')
  }

  const selectedTaskDetails = selectedTask
    ? [
        {
          label: 'Estado',
          value: selectedTask.status === 'open' ? 'Abierta' : selectedTask.status,
        },
        {
          label: 'Distancia',
          value: Number.isFinite(Number(selectedDistance)) ? `${Number(selectedDistance).toFixed(1)} km` : 'Sin distancia',
        },
        {
          label: 'Zona',
          value: formatTaskLocation(selectedTask),
        },
        {
          label: 'Publicada',
          value: formatTaskAge(selectedTask),
        },
      ]
    : []

  return (
    <section className={styles.home}>
      <section className={styles.mapWorkspace} aria-label="Mapa de solicitudes activas">
        <div className={styles.mapPane}>
          <TaskMap
            tasks={mapTasks}
            userLocation={center}
            radiusKm={radiusKm}
            distances={opportunityDistances}
            showUserWaypoint={false}
            showRadiusCircle={false}
            recenterOnCenter
            centerSource={locationSource}
            fitTasksOnLoad={shouldFitTasksOnLoad}
            fitTasksKey={locationSource}
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
                <p className="muted">El mapa se mantiene fijo; ajusta filtros y revisa el detalle aquí.</p>
              </div>
            </div>

            <div className={styles.filtersBar}>
              <div className={styles.locationModePanel} aria-label="Centro de búsqueda">
                <div>
                  <span>Centro operativo</span>
                  <strong>{center.label || locationSourceLabel}</strong>
                  <p>
                    {locationSource === 'current'
                      ? hasCurrentLocation
                        ? 'Usando tu ubicación actual para ordenar y filtrar.'
                        : 'Solicitando tu ubicación actual; mientras tanto usamos tu zona guardada.'
                      : locationSource === 'search'
                        ? 'Usando la zona buscada para centrar el mapa y filtrar tareas.'
                      : hasProfileLocation
                        ? 'Usando la zona guardada en ajustes.'
                        : 'No hay zona guardada todavía; completa ubicación en ajustes.'}
                  </p>
                </div>

                <div className={styles.locationModeActions}>
                  <button
                    type="button"
                    className={locationSource === 'current' ? styles.locationModeButtonActive : styles.locationModeButton}
                    onClick={helperHomeProps.onUseCurrentLocation}
                    aria-pressed={locationSource === 'current'}
                  >
                    Usar ubicación actual
                  </button>
                  <button
                    type="button"
                    className={locationSource === 'profile' ? styles.locationModeButtonActive : styles.locationModeButton}
                    onClick={helperHomeProps.onUseProfileLocation}
                    aria-pressed={locationSource === 'profile'}
                  >
                    Usar zona guardada
                  </button>
                  <button type="button" className={styles.locationModeLink} onClick={handleOpenSettings}>
                    Cambiar zona
                  </button>
                </div>
              </div>

              <div className={styles.filtersInner}>
                <CategoryFilter
                  category={helperHomeProps.category}
                  onChange={helperHomeProps.onCategoryChange}
                  options={helperHomeProps.categories || []}
                />
                <RadiusFilter
                  radius={helperHomeProps.radius}
                  onChange={helperHomeProps.onRadiusChange}
                  options={helperHomeProps.radiusOptions || []}
                />
              </div>

              <div className={styles.filtersCount}>
                <strong>{openTaskCount} solicitudes</strong>
                <span>{compatibilityAverage}% match medio</span>
              </div>
            </div>
          </section>

          <section className={styles.columnPanel} aria-label="Detalle de solicitud">
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Detalle</p>
                <h3>Solicitud activa</h3>
                <p className="muted">{selectedTask ? helperStatusCopy : 'Selecciona un marcador para cargar su detalle.'}</p>
              </div>
            </div>

            {selectedTask ? (
              <>
                <div className={styles.profileSummaryList}>
                  {selectedTaskDetails.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
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
                <p>Cuando una solicitud abierta entre en tu zona operativa, aparecerá en el mapa y en este panel.</p>
                <span className={styles.emptyNote}>Centro actual: {center.label}</span>
              </div>
            )}
          </section>
        </aside>
      </section>
    </section>
  )
}
