import { useNavigate } from 'react-router-dom'
import styles from '../../pages/Home/Home.module.css'
import { resolveMapAvatarUrl } from '../../assets/map-avatars'
import TaskMap from '../../features/map/components/TaskMap/TaskMap'
import LocationPanel from './LocationPanel'

export default function HomeMap({
  open,
  showLocationPanel,
  location,
  locationStatus,
  locationError,
  showApproxLocation,
  userAvatarUrl,
  userInitial,
  radiusKm,
  tasks,
  distancesById,
  onClose,
  onRequestLocation,
  onClearLocation,
  onDismissLocationPanel,
}) {
  const navigate = useNavigate()

  if (!open) {
    return null
  }

  const taskMapLocation = location
    ? { latitude: location.lat, longitude: location.lng, label: location.label }
    : null

  return (
    <div
      className={styles.mapLayer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className={styles.mapModal}>
        <header className={styles.mapHeader}>
          <div>
            <p className={styles.mapKicker}>Localizacion</p>
            <h2 id="map-title">Trabajos cerca de ti</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar mapa">
            ×
          </button>
        </header>

        {showLocationPanel && (
          <LocationPanel
            status={locationStatus}
            locationLabel={location?.label || ''}
            showApproxLocation={showApproxLocation}
            error={locationError}
            onRequestLocation={onRequestLocation}
            onClearLocation={() => {
              onClearLocation()
              onDismissLocationPanel()
            }}
            onDismiss={onDismissLocationPanel}
          />
        )}

        <TaskMap
          tasks={tasks.map((item) => item.task)}
          userLocation={taskMapLocation}
          radiusKm={radiusKm}
          distances={distancesById}
          userAvatarUrl={resolveMapAvatarUrl(userAvatarUrl) || userAvatarUrl || null}
          userInitial={userInitial}
          onTaskSelect={(taskId) => navigate(`/task/${taskId}`)}
        />
      </section>
    </div>
  )
}

