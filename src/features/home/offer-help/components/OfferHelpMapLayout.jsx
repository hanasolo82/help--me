import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryFilter from '../../../../components/home/CategoryFilter'
import RadiusFilter from '../../../../components/home/RadiusFilter'
import TaskFeed from '../../../../components/home/TaskFeed'
import TaskMap from '../../../../features/map/components/TaskMap/TaskMap'
import styles from '../../need-help/components/NeedHelpMapLayout.module.css'

export default function OfferHelpMapLayout({
  profile,
  location,
  userAvatarUrl,
  userInitial,
  radiusKm,
  visibleTasks,
  isLoading,
  error,
  distancesById,
  currentUserId,
  expandedTaskIds,
  publishingTaskId,
  onToggleTaskDetails,
  onPublishTask,
  onCancelTask,
  onOpenTaskChat,
  onEditTask,
  category,
  onCategoryChange,
  categories,
  radius,
  onRadiusChange,
  radiusOptions,
}) {
  const navigate = useNavigate()
  const [mobileView, setMobileView] = useState('map')
  const [mapBounds, setMapBounds] = useState(null)

  const taskMapLocation = useMemo(() => {
    if (location) {
      return { latitude: location.lat, longitude: location.lng, label: location.label }
    }

    const lat = Number(profile?.lat)
    const lng = Number(profile?.lng)

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng, label: profile?.neighborhood || profile?.city || 'Tu zona' }
    }

    return null
  }, [location, profile?.city, profile?.lat, profile?.lng, profile?.neighborhood])

  const taskCount = visibleTasks?.length || 0
  const viewportTasks = useMemo(() => {
    if (!mapBounds) {
      return visibleTasks || []
    }

    return (visibleTasks || []).filter(({ task }) => {
      const lat = Number(task?.lat)
      const lng = Number(task?.lng)

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
  }, [mapBounds, visibleTasks])

  return (
    <section className={styles.shell}>
      <div className={styles.filtersBar}>
        <div className={styles.filtersHeader}>
          <p className="eyebrow">Ofrezco ayuda</p>
          <h2>Tareas visibles en tu zona</h2>
          <p className="muted">Explora trabajos cercanos, cambia filtros y elige una tarea para ayudar.</p>
        </div>

        <div className={styles.filtersBlock}>
          <CategoryFilter category={category} onChange={onCategoryChange} options={categories} />
          <RadiusFilter radius={radius} onChange={onRadiusChange} options={radiusOptions} />
        </div>
      </div>

      <div className={styles.mobileTabs} role="tablist" aria-label="Vista de tareas">
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
              <p className="eyebrow">Mapa</p>
              <h2>Tareas abiertas cerca de ti</h2>
              <p className="muted">Selecciona una tarea para verla en detalle y contactar si encaja contigo.</p>
            </div>
          </div>

          <div className={styles.mapShell}>
            <TaskMap
              tasks={(visibleTasks || []).map((item) => item.task)}
              userLocation={taskMapLocation}
              radiusKm={radiusKm}
              distances={distancesById}
              userAvatarUrl={userAvatarUrl}
              userInitial={userInitial}
              onTaskSelect={(taskId) => navigate(`/task/${taskId}`)}
              onViewportChange={setMapBounds}
            />
          </div>

          {!taskCount && !isLoading && !error && (
            <div className={styles.emptyState}>
              <strong>No hay tareas visibles en esta zona.</strong>
              <p className="muted">Amplia el radio o ajusta los filtros para encontrar más oportunidades.</p>
            </div>
          )}
        </section>

        <div className={mobileView === 'map' ? `${styles.panelPane} ${styles.hiddenOnMobile}` : styles.panelPane}>
          <div className={styles.panelShell}>
            <div className={styles.panelMeta}>
              <p className="eyebrow">Listado</p>
              <strong>{taskCount} tareas disponibles</strong>
              <p className="muted">
                {viewportTasks.length} tareas visibles en esta pantalla del mapa
                {taskCount !== viewportTasks.length ? ` · ${taskCount} en total en el filtro` : ''}
              </p>
            </div>

            <div className={styles.listScroll}>
              <TaskFeed
                title="Tareas disponibles"
                subtitle="Escoge una tarea cercana para ayudar"
                tasks={viewportTasks}
                loading={isLoading}
                error={error}
                count={viewportTasks.length}
                isHelperMode
                currentUserId={currentUserId}
                expandedTaskIds={expandedTaskIds}
                publishingTaskId={publishingTaskId}
                distancesById={distancesById}
                onToggleTaskDetails={onToggleTaskDetails}
                onPublishTask={onPublishTask}
                onCancelTask={onCancelTask}
                onOpenTaskChat={onOpenTaskChat}
                onEditTask={onEditTask}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
