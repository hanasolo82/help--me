import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, useMap, useMapEvents } from 'react-leaflet'
import { useAvailableHelpers } from '../hooks/useAvailableHelpers'
import { useSelectedHelper } from '../hooks/useSelectedHelper'
import HelperListPanel from './HelperListPanel'
import MapCategoryChips from './MapCategoryChips'
import HelperMapMarker from './HelperMapMarker'
import PublishedRequestCard from './PublishedRequestCard'
import RequesterTaskMarker from './RequesterTaskMarker'
import RequesterTaskSummary from './RequesterTaskSummary'
import MapTileLayer from '../../../../shared/ui/map/MapTileLayer'
import MapAutoResize from '../../../../shared/ui/map/MapAutoResize'
import Modal from '../../../../shared/ui/Modal/Modal'
import { useMediaQuery } from '../../../../shared/hooks/useMediaQuery'
import styles from './NeedHelpMapLayout.module.css'

const defaultMapCenter = [41.6523, -0.9019]
const fallbackZoom = 15
const minimumMapZoom = 10

function normalizeZoom(zoom, currentZoom = fallbackZoom) {
  const nextZoom = Number(zoom)

  if (Number.isFinite(nextZoom)) {
    return nextZoom
  }

  const safeCurrentZoom = Number(currentZoom)
  return Number.isFinite(safeCurrentZoom) && safeCurrentZoom >= minimumMapZoom
    ? safeCurrentZoom
    : fallbackZoom
}

function stopMapAnimationIfMounted(map) {
  try {
    if (map?._loaded && map?._mapPane) {
      map.stop()
    }
  } catch {
    // Leaflet puede haber desmontado sus panes internos durante el cambio de modo.
  }
}

// Centra el mapa: el primer centrado salta directo (sin viaje desde el centro
// por defecto); los siguientes vuelan suave (flyTo). Con reduced-motion, sin animar.
function RecenterMap({ center, zoom = null }) {
  const map = useMap()
  const hasCenteredRef = useRef(false)

  useEffect(() => {
    const targetZoom = normalizeZoom(zoom, map.getZoom())
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

    if (!hasCenteredRef.current || reduceMotion) {
      hasCenteredRef.current = true
      map.setView(center, targetZoom, { animate: false })
      return undefined
    }

    map.flyTo(center, targetZoom, { duration: 0.75 })

    return () => {
      stopMapAnimationIfMounted(map)
    }
  }, [center, map, zoom])

  return null
}

// Expone la instancia del mapa al layout (p. ej. "Ampliar zona" desde el empty state).
function MapRefCapture({ mapRef }) {
  const map = useMap()

  useEffect(() => {
    mapRef.current = map

    return () => {
      if (mapRef.current === map) {
        mapRef.current = null
      }
    }
  }, [map, mapRef])

  return null
}

function ViewportReporter({ onViewportChange }) {
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
    load(event) {
      if (!onViewportChange) return
      const bounds = event.target.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    },
    moveend(event) {
      if (!onViewportChange) return
      const bounds = event.target.getBounds()
      onViewportChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    },
    zoomend(event) {
      if (!onViewportChange) return
      const bounds = event.target.getBounds()
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

function toMapCenter(location, profileCenter) {
  const lat = Number(location?.lat ?? profileCenter?.lat)
  const lng = Number(location?.lng ?? profileCenter?.lng)

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return [lat, lng]
  }

  return defaultMapCenter
}

function hasMapPosition(entry) {
  return Number.isFinite(Number(entry?.lat)) && Number.isFinite(Number(entry?.lng))
}

function buildMapCenterKey(center) {
  if (!Array.isArray(center) || center.length < 2) {
    return 'fallback'
  }

  const lat = Number(center[0])
  const lng = Number(center[1])

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'fallback'
  }

  return `${lat.toFixed(5)}:${lng.toFixed(5)}`
}

function isInsideBounds(entry, bounds) {
  if (!bounds || !hasMapPosition(entry)) return false

  const lat = Number(entry.lat)
  const lng = Number(entry.lng)

  return (
    lat <= bounds.north &&
    lat >= bounds.south &&
    lng <= bounds.east &&
    lng >= bounds.west
  )
}

function matchesSkill(helper, selectedSkillId) {
  if (!selectedSkillId || selectedSkillId === 'all') return false

  return (helper?.skills || []).some((skill) => {
    const skillId = skill?.category || skill?.name || skill?.id
    return skillId === selectedSkillId
  })
}

export default function NeedHelpMapLayout({
  profile,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
  publishNotice = '',
  contactError = '',
  preferredMobileView,
  onPreviewHelper,
  onPublishRequest,
  onContact,
  requesterTasks = [],
  selectedRequesterTaskId = null,
  onSelectRequesterTask,
  focusRequesterTaskId = null,
  onEditRequesterTask,
  onRetireRequesterTask,
  onOpenRequesterTaskDetail,
  onDismissPublishNotice,
  retirePending = false,
}) {
  const navigate = useNavigate()
  const [mobileView, setMobileView] = useState(preferredMobileView || 'map')
  const [selectedSkillId, setSelectedSkillId] = useState('all')
  const [mapBounds, setMapBounds] = useState(null)
  const mapRef = useRef(null)
  // En pantallas estrechas, el detalle del pin se abre como bottom-sheet (el popup
  // de Leaflet queda pequeño e incómodo con el pulgar); en desktop, popup normal.
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const [sheetTask, setSheetTask] = useState(null)

  // Al enfocar una solicitud (publicar o "Ver en el mapa"), asegura la vista de mapa
  // en móvil. Ajuste de estado durante el render (patrón derivado-de-props de React).
  const [lastFocusId, setLastFocusId] = useState(focusRequesterTaskId)
  if (focusRequesterTaskId !== lastFocusId) {
    setLastFocusId(focusRequesterTaskId)
    if (focusRequesterTaskId) {
      setMobileView('map')
    }
  }

  const {
    center,
    hasLocation,
    helpers,
    skillFilters,
    isLoading,
    error,
  } = useAvailableHelpers({
    profile,
    location,
    mapBounds,
    selectedSkillId,
  })

  const {
    selectedHelper,
    selectedHelperId,
    selectHelper,
  } = useSelectedHelper(helpers)

  const searchCenter = useMemo(() => toMapCenter(location, center), [center, location])
  const mapCenterKey = useMemo(() => buildMapCenterKey(searchCenter), [searchCenter])
  const focusedRequesterTask = useMemo(
    () => requesterTasks.find((task) => task.id === focusRequesterTaskId) || null,
    [focusRequesterTaskId, requesterTasks],
  )
  const focusCenter = useMemo(
    () => {
      if (hasMapPosition(focusedRequesterTask)) {
        return [Number(focusedRequesterTask.lat), Number(focusedRequesterTask.lng)]
      }

      if (hasMapPosition(selectedHelper)) {
        return [selectedHelper.lat, selectedHelper.lng]
      }

      return searchCenter
    },
    [focusedRequesterTask, searchCenter, selectedHelper],
  )
  // Vista requester siempre arranca y recentra a nivel barrio.
  const focusZoom = fallbackZoom
  const viewportHelpers = useMemo(() => {
    return helpers.filter((helper) => isInsideBounds(helper, mapBounds) || matchesSkill(helper, selectedSkillId))
  }, [helpers, mapBounds, selectedSkillId])

  function handleSelectHelper(helper) {
    selectHelper(helper)
    setMobileView('map')
    onPreviewHelper?.(helper)
  }

  return (
    <section className={styles.shell}>
      <div className={styles.mobileTabs} role="tablist" aria-label="Vista de helpers">
        <button
          type="button"
          className={mobileView === 'map' ? styles.mobileTabActive : styles.mobileTab}
          onClick={() => setMobileView('map')}
        >
          Mapa
        </button>
        <button
          type="button"
          className={mobileView === 'list' ? styles.mobileTabActive : styles.mobileTab}
          onClick={() => setMobileView('list')}
        >
          Lista
        </button>
      </div>

      <div className={styles.desktopGrid}>
        <section className={mobileView === 'list' ? `${styles.mapPane} ${styles.hiddenOnMobile}` : styles.mapPane}>
          <div className={styles.mapShell}>
            <MapCategoryChips
              filters={skillFilters}
              selectedSkillId={selectedSkillId}
              onSkillChange={setSelectedSkillId}
            />

            <MapContainer
              key={mapCenterKey}
              center={focusCenter}
              zoom={fallbackZoom}
              minZoom={minimumMapZoom}
              scrollWheelZoom
              className={styles.map}
              whenReady={({ target: map }) => {
                map.invalidateSize({ animate: false })
                map.setView(focusCenter, normalizeZoom(focusZoom), { animate: false })
              }}
            >
              <RecenterMap center={focusCenter} zoom={focusZoom} />
              <MapRefCapture mapRef={mapRef} />
              <ViewportReporter onViewportChange={setMapBounds} />
              <MapAutoResize />
              <MapTileLayer />

              {helpers.filter(hasMapPosition).map((helper) => (
                <HelperMapMarker
                  key={helper.id}
                  helper={helper}
                  selected={selectedHelperId === helper.id}
                  onSelect={handleSelectHelper}
                />
              ))}

              {requesterTasks
                .filter((task) => task.status === 'open' && Number.isFinite(Number(task.lat)) && Number.isFinite(Number(task.lng)))
                .map((task) => (
                  <RequesterTaskMarker
                    key={task.id}
                    task={task}
                    selected={selectedRequesterTaskId === task.id}
                    onSelect={(selectedTask) => {
                      onSelectRequesterTask?.(selectedTask)
                      if (isNarrow) {
                        setSheetTask(selectedTask)
                      }
                    }}
                    onEdit={onEditRequesterTask}
                    onRetire={onRetireRequesterTask}
                    onOpenDetail={onOpenRequesterTaskDetail}
                    retirePending={retirePending}
                    detailMode={isNarrow ? 'sheet' : 'popup'}
                  />
                ))}
            </MapContainer>
          </div>

        </section>

        <div className={mobileView === 'map' ? `${styles.panelPane} ${styles.hiddenOnMobile}` : styles.panelPane}>
          {publishNotice && focusedRequesterTask ? (
            <PublishedRequestCard
              task={focusedRequesterTask}
              justPublished
              onViewOnMap={onSelectRequesterTask}
              onEdit={onEditRequesterTask}
              onRetire={onRetireRequesterTask}
              onDismiss={onDismissPublishNotice}
              retirePending={retirePending}
            />
          ) : null}

          {contactError ? (
            <p className={`${styles.panelNotice} ${styles.panelNoticeError}`} role="alert">
              {contactError}
            </p>
          ) : null}

          <HelperListPanel
            visibleHelpers={viewportHelpers}
            selectedHelperId={selectedHelperId}
            onSelectHelper={handleSelectHelper}
            onOpenProfile={(helper) => navigate(`/profile/${helper.id}`)}
            onContact={onContact}
            loading={isLoading}
            error={error}
            hasLocation={hasLocation}
            locationError={locationStatus !== 'loading' ? locationError : ''}
            onRequestLocation={onRequestLocation}
            onPublishRequest={onPublishRequest}
            onExpandMap={() => mapRef.current?.zoomOut(2)}
          />
        </div>
      </div>

      {/* Detalle del pin en móvil: bottom-sheet (el Modal base ya lo es en <640px)
          con la MISMA mini-tarjeta que el popup de desktop. Las acciones cierran
          el sheet antes de delegar para no apilar superficies. */}
      <Modal
        open={Boolean(sheetTask)}
        onClose={() => setSheetTask(null)}
        size="sm"
        ariaLabel={sheetTask ? `Tu solicitud: ${sheetTask.title}` : 'Tu solicitud'}
      >
        <RequesterTaskSummary
          task={sheetTask}
          onEdit={(task) => {
            setSheetTask(null)
            onEditRequesterTask?.(task)
          }}
          onRetire={(task) => {
            setSheetTask(null)
            onRetireRequesterTask?.(task)
          }}
          onOpenDetail={(task) => {
            setSheetTask(null)
            onOpenRequesterTaskDetail?.(task)
          }}
          retirePending={retirePending}
        />
      </Modal>
    </section>
  )
}
