import { useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTransitionNavigate } from '../../../shared/navigation/usePageTransition'
import { isTaskTimeWindowExpired } from '../../tasks/availability/taskAvailability'
import { getTaskUrgency } from '../../tasks/urgency/taskUrgency'
import TaskMap from '../../map/components/TaskMap/TaskMap'
import TaskCategoryChips from './TaskCategoryChips'
import TaskOpportunityCard from './TaskOpportunityCard'
import HelperTaskMarker from './HelperTaskMarker'
import { applyToTask, respondToDirectTask, withdrawTaskApplication } from '../../../services/tasksService'
import { getLocationLabel } from '../../profile/utils/profileFormatters'
import styles from '../styles/helperHome.module.css'

const DEFAULT_CENTER = { latitude: 41.6523, longitude: -0.9019, label: 'Tu zona' }

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
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

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-ES')
}

function getTaskSearchMatch(task, searchQuery) {
  const tokens = [...new Set(String(searchQuery || '').split(/\s+/).filter(Boolean))]
  if (tokens.length === 0) {
    return { matches: true, allTermsMatch: true, score: 0 }
  }

  const requester = task?.creator_profile || {}
  const searchableFields = [
    { value: task?.title, weight: 5 },
    { value: task?.category, weight: 4 },
    { value: task?.description, weight: 3 },
    { value: task?.zone || task?.location_label || task?.location, weight: 2 },
    { value: requester?.display_name || requester?.full_name || requester?.username, weight: 1 },
  ]

  let matchedTerms = 0
  let score = 0

  for (const token of tokens) {
    const bestWeight = searchableFields.reduce((best, field) => {
      const matches = normalizeSearchText(field.value).includes(token)
      return matches ? Math.max(best, field.weight) : best
    }, 0)

    if (bestWeight > 0) {
      matchedTerms += 1
      score += bestWeight
    }
  }

  return {
    matches: matchedTerms > 0,
    allTermsMatch: matchedTerms === tokens.length,
    score,
  }
}

function rankTaskSearchEntries(entries, searchQuery) {
  return entries
    .map((entry) => ({ ...entry, searchMatch: getTaskSearchMatch(entry.task, searchQuery) }))
    .filter((entry) => entry.searchMatch.matches)
    .sort((left, right) => {
      if (left.searchMatch.allTermsMatch !== right.searchMatch.allTermsMatch) {
        return left.searchMatch.allTermsMatch ? -1 : 1
      }

      if (left.searchMatch.score !== right.searchMatch.score) {
        return right.searchMatch.score - left.searchMatch.score
      }

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
    .map(({ task, distance, compatibilityScore }) => ({ task, distance, compatibilityScore }))
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
      if (
        !task ||
        task.status !== 'open' ||
        isTaskTimeWindowExpired(task) ||
        task.created_by === currentUserId
      ) return null

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
      if (left.task.is_direct_request !== right.task.is_direct_request) {
        return left.task.is_direct_request ? -1 : 1
      }

      const leftUrgency = getTaskUrgency(left.task)
      const rightUrgency = getTaskUrgency(right.task)
      if (Boolean(leftUrgency) !== Boolean(rightUrgency)) {
        return leftUrgency ? -1 : 1
      }

      if (leftUrgency && rightUrgency && leftUrgency.minutesUntilStart !== rightUrgency.minutesUntilStart) {
        return leftUrgency.minutesUntilStart - rightUrgency.minutesUntilStart
      }

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
  const transitionNavigate = useTransitionNavigate()
  const queryClient = useQueryClient()
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [mapBounds, setMapBounds] = useState(null)
  const [taskSearchOpen, setTaskSearchOpen] = useState(false)
  const [taskSearchQuery, setTaskSearchQuery] = useState('')
  const [pendingOfferTaskId, setPendingOfferTaskId] = useState(null)
  const [offerError, setOfferError] = useState('')
  const taskMapRef = useRef(null)

  const offerMutation = useMutation({
    mutationFn: (task) => (
      task.is_direct_request
        ? respondToDirectTask(task.id, 'accept')
        : applyToTask(task.id)
    ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const withdrawMutation = useMutation({
    mutationFn: (applicationId) => withdrawTaskApplication(applicationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  const center = buildCenter(helperHomeProps.mapLocation, profile)
  const categoryMapEntries = useMemo(
    () => buildMapEntries(helperHomeProps.visibleTasks || [], helperHomeProps.currentUserId, profile),
    [helperHomeProps.currentUserId, helperHomeProps.visibleTasks, profile],
  )
  const allOpenMapEntries = useMemo(
    () => buildMapEntries(
      helperHomeProps.availableTasks || helperHomeProps.visibleTasks || [],
      helperHomeProps.currentUserId,
      profile,
    ),
    [helperHomeProps.availableTasks, helperHomeProps.currentUserId, helperHomeProps.visibleTasks, profile],
  )
  const normalizedTaskSearchQuery = taskSearchOpen ? normalizeSearchText(taskSearchQuery).trim() : ''
  const hasGlobalTaskSearch = normalizedTaskSearchQuery.length >= 3
  const searchResultEntries = useMemo(
    () => (
      hasGlobalTaskSearch
        ? rankTaskSearchEntries(allOpenMapEntries, normalizedTaskSearchQuery)
        : categoryMapEntries
    ),
    [allOpenMapEntries, categoryMapEntries, hasGlobalTaskSearch, normalizedTaskSearchQuery],
  )

  const mapEntries = useMemo(
    () => searchResultEntries.filter((entry) => entry.task.is_direct_request || isWithinBounds(entry.task, mapBounds)),
    [mapBounds, searchResultEntries],
  )
  const visibleMapEntries = useMemo(
    () => searchResultEntries.filter((entry) => isWithinBounds(entry.task, mapBounds)),
    [mapBounds, searchResultEntries],
  )
  const listEntries = hasGlobalTaskSearch ? searchResultEntries : mapEntries

  const opportunityDistances = useMemo(
    () =>
      visibleMapEntries.reduce((acc, entry) => {
        if (Number.isFinite(Number(entry.distance))) {
          acc[entry.task.id] = entry.distance
        }
        return acc
      }, {}),
    [visibleMapEntries],
  )

  const resolvedSelectedTaskId =
    listEntries.length === 0
      ? null
      : listEntries.some((entry) => entry.task.id === selectedTaskId)
        ? selectedTaskId
        : listEntries[0].task.id

  const visibleInMapCount = visibleMapEntries.length
  const globalResultCount = searchResultEntries.length
  const mapTasks = visibleMapEntries.map((entry) => entry.task)
  const locationSource =
    helperHomeProps.locationSource === 'current'
      ? 'current'
      : helperHomeProps.locationSource === 'search'
        ? 'search'
        : 'profile'
  const shouldRecenterOnLocationChange = locationSource === 'search'

  // Estado de la oferta por tarea (misma lógica que antes, ahora por tarjeta):
  // etiqueta, si está deshabilitada y si su acción está en curso.
  function getOfferState(task) {
    const application = task?.current_user_application || null
    const status = application?.status
    const hasPending = status === 'pending'
    const isSelected = status === 'selected'
    const isOpen = task?.status === 'open' && !isTaskTimeWindowExpired(task)
    const isOwn = task?.created_by === helperHomeProps.currentUserId
    const directBlocked = task?.is_direct_request && task?.target_helper_id !== helperHomeProps.currentUserId
    const canOffer = isOpen && !isOwn && !directBlocked && !hasPending && !isSelected
    const isPendingAction = pendingOfferTaskId === task?.id
    const mutationActive = offerMutation.isPending || withdrawMutation.isPending

    const label = isPendingAction
      ? hasPending
        ? 'Retirando...'
        : 'Enviando...'
      : task?.is_direct_request
        ? 'Aceptar solicitud'
        : isSelected
          ? 'Seleccionado'
          : hasPending
            ? 'Retirar oferta'
            : 'Ayudar'

    return {
      label,
      disabled: mutationActive || isSelected || (!canOffer && !hasPending),
      pending: isPendingAction,
    }
  }

  async function handleOffer(task) {
    const application = task?.current_user_application || null
    const hasPendingOffer = application?.status === 'pending'

    if (
      !task ||
      task.status !== 'open' ||
      isTaskTimeWindowExpired(task) ||
      task.created_by === helperHomeProps.currentUserId ||
      (task.is_direct_request && task.target_helper_id !== helperHomeProps.currentUserId) ||
      offerMutation.isPending ||
      withdrawMutation.isPending
    ) {
      return
    }

    setOfferError('')
    setPendingOfferTaskId(task.id)

    try {
      if (hasPendingOffer) {
        await withdrawMutation.mutateAsync(application.id)
        return
      }

      if (!application) {
        await offerMutation.mutateAsync(task)
      }
    } catch (error) {
      setOfferError(error?.message || 'No hemos podido actualizar tu oferta.')
    } finally {
      setPendingOfferTaskId(null)
    }
  }

  function handleOpenTask(task) {
    transitionNavigate(`/task/${task.id}`)
  }

  function focusTaskOnMap(task) {
    const lat = Number(task?.lat)
    const lng = Number(task?.lng)
    const map = taskMapRef.current

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return

    try {
      if (!map?._loaded || !map._mapPane) return

      const currentZoom = Number(map.getZoom())
      const targetZoom = Number.isFinite(currentZoom) ? Math.max(currentZoom, 13) : 15
      map.setView([lat, lng], targetZoom, { animate: true })
    } catch {
      // Puede desmontarse al cambiar entre mapa y lista en móvil.
    }
  }

  function handleSelectTask(task) {
    if (!task?.id) return

    setSelectedTaskId(task.id)
    focusTaskOnMap(task)
  }

  return (
    <section className={styles.home}>
      <section className={styles.mapWorkspace} aria-label="Mapa de solicitudes activas">
        <div className={styles.mapPane}>
          <TaskCategoryChips
            category={helperHomeProps.category}
            categories={helperHomeProps.categories}
            onChange={helperHomeProps.onCategoryChange}
            searchOpen={taskSearchOpen}
            searchQuery={taskSearchQuery}
            onSearchOpenChange={setTaskSearchOpen}
            onSearchQueryChange={setTaskSearchQuery}
          />

          <TaskMap
            tasks={mapTasks}
            userLocation={center}
            distances={opportunityDistances}
            selectedTaskId={resolvedSelectedTaskId}
            showUserWaypoint={false}
            recenterOnCenter={shouldRecenterOnLocationChange}
            centerSource={locationSource}
            fitTasksOnLoad={false}
            fitTasksKey={locationSource}
            mapRef={taskMapRef}
            onViewportChange={setMapBounds}
            renderTaskMarker={(task, { selected }) => (
              <HelperTaskMarker
                key={task.id}
                task={task}
                selected={selected}
                offer={getOfferState(task)}
                onSelect={handleSelectTask}
                onOpenDetail={handleOpenTask}
                onOffer={handleOffer}
              />
            )}
          />
        </div>

        <aside className={styles.mapDrawer}>
          <header className={styles.listHeader}>
            <p className="eyebrow">Buscar tareas</p>
            <h2>Solicitudes publicadas</h2>
            <p className="muted">Busca por necesidad o revisa las solicitudes visibles en el mapa.</p>
            <div className={styles.listCount}>
              {hasGlobalTaskSearch ? (
                <>
                  <strong>{globalResultCount} {globalResultCount === 1 ? 'resultado' : 'resultados'}</strong>
                  <span>{visibleInMapCount} visibles en el mapa</span>
                </>
              ) : (
                <>
                  <strong>{visibleInMapCount} en el mapa</strong>
                  <span>{categoryMapEntries.length} con {categoryMapEntries.length === 1 ? 'este filtro' : 'estos filtros'}</span>
                </>
              )}
            </div>
          </header>

          {offerError ? (
            <p className="auth-message error" role="alert">{offerError}</p>
          ) : null}

          <div className={styles.listScroll}>
            {listEntries.length === 0 ? (
              <div className={styles.empty}>
                <strong>{hasGlobalTaskSearch ? 'No encontramos solicitudes para esta búsqueda' : 'No hay solicitudes visibles todavía'}</strong>
                <p>{hasGlobalTaskSearch ? 'Prueba con una necesidad más breve o con otras palabras.' : 'Cuando una solicitud abierta entre en la parte visible del mapa, aparecerá aquí.'}</p>
                {!hasGlobalTaskSearch ? <span className={styles.emptyNote}>Mueve el mapa o busca otra zona desde el header.</span> : null}
              </div>
            ) : (
              listEntries.map((entry) => (
                <TaskOpportunityCard
                  key={entry.task.id}
                  task={entry.task}
                  distanceKm={entry.distance}
                  selected={entry.task.id === resolvedSelectedTaskId}
                  onSelect={handleSelectTask}
                  onOpenDetail={handleOpenTask}
                  offer={getOfferState(entry.task)}
                  onOffer={handleOffer}
                />
              ))
            )}
          </div>
        </aside>
      </section>
    </section>
  )
}
