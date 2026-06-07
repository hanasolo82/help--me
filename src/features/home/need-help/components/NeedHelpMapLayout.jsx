import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, useMap, useMapEvents } from 'react-leaflet'
import { useAvailableHelpers } from '../hooks/useAvailableHelpers'
import { useSelectedHelper } from '../hooks/useSelectedHelper'
import HelperListPanel from './HelperListPanel'
import HelperMapMarker from './HelperMapMarker'
import RequesterTaskMarker from './RequesterTaskMarker'
import MapTileLayer from '../../../../shared/ui/map/MapTileLayer'
import styles from './NeedHelpMapLayout.module.css'

function RecenterMap({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

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

  return [41.6523, -0.9019]
}

function hasMapPosition(entry) {
  return Number.isFinite(Number(entry?.lat)) && Number.isFinite(Number(entry?.lng))
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
}) {
  const navigate = useNavigate()
  const [mobileView, setMobileView] = useState(preferredMobileView || 'map')
  const [selectedSkillId, setSelectedSkillId] = useState('all')
  const [mapBounds, setMapBounds] = useState(null)

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
  const focusCenter = useMemo(
    () => {
      const focusedRequesterTask = requesterTasks.find((task) => task.id === focusRequesterTaskId)

      if (focusedRequesterTask && Number.isFinite(Number(focusedRequesterTask.lat)) && Number.isFinite(Number(focusedRequesterTask.lng))) {
        return [Number(focusedRequesterTask.lat), Number(focusedRequesterTask.lng)]
      }

      if (hasMapPosition(selectedHelper)) {
        return [selectedHelper.lat, selectedHelper.lng]
      }

      return searchCenter
    },
    [focusRequesterTaskId, requesterTasks, searchCenter, selectedHelper],
  )
  const viewportHelpers = useMemo(() => {
    return helpers.filter((helper) => isInsideBounds(helper, mapBounds) || matchesSkill(helper, selectedSkillId))
  }, [helpers, mapBounds, selectedSkillId])

  const markerLegend = useMemo(
    () => [
      { label: 'Tu ubicación', tone: 'me' },
      { label: 'Helpers disponibles', tone: 'helper' },
      { label: 'Mis solicitudes', tone: 'task' },
    ],
    [],
  )

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
            <div className={styles.mapLegend} aria-label="Leyenda del mapa">
              {markerLegend.map((item) => (
                <span key={item.label} className={styles.legendItem}>
                  <span
                    className={
                      item.tone === 'me'
                        ? `${styles.legendSwatch} ${styles.legendSwatchMe}`
                        : item.tone === 'helper'
                          ? `${styles.legendSwatch} ${styles.legendSwatchHelper}`
                        : item.tone === 'task'
                          ? `${styles.legendSwatch} ${styles.legendSwatchTask}`
                        : `${styles.legendSwatch} ${styles.legendSwatchOpenTask}`
                    }
                  />
                  {item.label}
                </span>
              ))}
            </div>

            <MapContainer center={focusCenter} zoom={13} scrollWheelZoom className={styles.map}>
              <RecenterMap center={focusCenter} />
              <ViewportReporter onViewportChange={setMapBounds} />
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
                    onSelect={onSelectRequesterTask}
                  />
                ))}
            </MapContainer>
          </div>

        </section>

        <div className={mobileView === 'map' ? `${styles.panelPane} ${styles.hiddenOnMobile}` : styles.panelPane}>
          {publishNotice ? (
            <section className={styles.panelNotice} data-tone="success">
              <strong>{publishNotice}</strong>
              <p className="muted">
                {publishNotice === 'Solicitud publicada'
                  ? 'Ya es visible para ayudantes cercanos.'
                  : 'La solicitud quedó publicada y fijada en el mapa.'}
              </p>
            </section>
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
            skillFilters={skillFilters}
            selectedSkillId={selectedSkillId}
            onSkillChange={setSelectedSkillId}
            loading={isLoading}
            error={error}
            hasLocation={hasLocation}
            locationError={locationStatus !== 'loading' ? locationError : ''}
            onRequestLocation={onRequestLocation}
            onPublishRequest={onPublishRequest}
          />
        </div>
      </div>
    </section>
  )
}
