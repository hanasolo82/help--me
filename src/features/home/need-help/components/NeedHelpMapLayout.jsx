import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useAvailableHelpers } from '../hooks/useAvailableHelpers'
import { useSelectedHelper } from '../hooks/useSelectedHelper'
import HelperListPanel from './HelperListPanel'
import HelperMapMarker from './HelperMapMarker'
import RequesterTaskMarker from './RequesterTaskMarker'
import { MAP_FILL, MAP_PRIMARY } from '../../../../styles/mapColors'
import styles from './NeedHelpMapLayout.module.css'

function RecenterMap({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function ViewportReporter({ onViewportChange }) {
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

export default function NeedHelpMapLayout({
  profile,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
  preferredMobileView,
  onPreviewHelper,
  onPublishRequest,
  requesterTasks = [],
  selectedRequesterTaskId = null,
  onSelectRequesterTask,
  focusRequesterTaskId = null,
}) {
  const navigate = useNavigate()
  const [mobileView, setMobileView] = useState(preferredMobileView || 'map')
  const [radiusKm, setRadiusKm] = useState(Number(profile?.search_radius_km ?? 10) || 10)
  const [selectedSkillId, setSelectedSkillId] = useState('all')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
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
    radiusKm,
    selectedSkillId,
    onlyAvailable,
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

      if (selectedHelper) {
        return [selectedHelper.lat, selectedHelper.lng]
      }

      return searchCenter
    },
    [focusRequesterTaskId, requesterTasks, searchCenter, selectedHelper],
  )
  const viewportHelpers = useMemo(() => {
    if (!mapBounds) {
      return helpers
    }

    return helpers.filter((helper) => {
      const lat = Number(helper?.lat)
      const lng = Number(helper?.lng)

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return false
      }

      return (
        lat <= mapBounds.north &&
        lat >= mapBounds.south &&
        lng <= mapBounds.east &&
        lng >= mapBounds.west
      )
    })
  }, [helpers, mapBounds])

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
          <div className={styles.mapHeader}>
            <div>
              <p className="eyebrow">Necesito ayuda</p>
              <h2>Personas disponibles</h2>
              <p className="muted">Explora personas disponibles, revisa su perfil y elige a quién contactar.</p>
            </div>
          </div>

          <div className={styles.mapShell}>
            <MapContainer center={focusCenter} zoom={13} scrollWheelZoom className={styles.map}>
              <RecenterMap center={focusCenter} />
              <ViewportReporter onViewportChange={setMapBounds} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {hasLocation && Number.isFinite(Number(radiusKm)) && (
                <Circle
                  center={searchCenter}
                  radius={radiusKm * 1000}
                  pathOptions={{ color: MAP_PRIMARY, fillColor: MAP_FILL, fillOpacity: 0.14, weight: 3 }}
                />
              )}

              {helpers.map((helper) => (
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

          {!hasLocation && locationStatus !== 'loading' && (
            <div className={styles.locationNotice}>
              <strong>No hemos podido fijar tu zona de referencia.</strong>
              <p className="muted">
                {locationError || 'Activa la ubicación o usa tu perfil para ver personas cercanas.'}
              </p>
              {onRequestLocation && (
                <button type="button" className="primary-action" onClick={onRequestLocation}>
                  Usar mi ubicación
                </button>
              )}
            </div>
          )}
        </section>

        <div className={mobileView === 'map' ? `${styles.panelPane} ${styles.hiddenOnMobile}` : styles.panelPane}>
          <HelperListPanel
            helpers={helpers}
            visibleHelpers={viewportHelpers}
            selectedHelperId={selectedHelperId}
            onSelectHelper={handleSelectHelper}
            onOpenProfile={(helper) => navigate(`/profile/${helper.id}`)}
            onContact={() => navigate('/chats')}
            skillFilters={skillFilters}
            selectedSkillId={selectedSkillId}
            onSkillChange={setSelectedSkillId}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            onlyAvailable={onlyAvailable}
            onOnlyAvailableChange={setOnlyAvailable}
            loading={isLoading}
            error={error}
            locationLabel={location?.label || profile?.neighborhood || profile?.city || 'Tu zona'}
            hasLocation={hasLocation}
            onRequestLocation={onRequestLocation}
            onPublishRequest={onPublishRequest}
          />
        </div>
      </div>
    </section>
  )
}
