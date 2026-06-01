import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createOrGetDirectConversation } from '../../../../services/chatService'
import TaskMap from '../../../../features/map/components/TaskMap/TaskMap'
import TaskFiltersBar from './TaskFiltersBar'
import TaskListPanel from './TaskListPanel'
import TaskPreviewModal from './TaskPreviewModal'
import styles from '../../need-help/components/NeedHelpMapLayout.module.css'

export default function OfferHelpMapLayout({
  profile,
  location,
  userAvatarUrl,
  userInitial,
  radiusKm,
  visibleTasks = [],
  isLoading,
  error,
  distancesById,
  currentUserId,
  category,
  onCategoryChange,
  categories,
  radius,
  onRadiusChange,
  radiusOptions = [],
  title = 'Solicitudes abiertas cerca de ti',
  lead = 'Selecciona una solicitud, revisa el detalle y contacta solo si sigue abierta.',
}) {
  const navigate = useNavigate()
  const [mobileView, setMobileView] = useState('map')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [favoriteTaskIds, setFavoriteTaskIds] = useState([])

  const toggleFavoriteMutation = useMutation({
    mutationFn: async (task) => task,
    onSuccess: async (task) => {
      setFavoriteTaskIds((current) =>
        current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id],
      )
    },
  })

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
  const nextRadiusOption = useMemo(
    () => radiusOptions.find((option) => option > radius) || radiusOptions[radiusOptions.length - 1] || radius,
    [radius, radiusOptions],
  )
  const viewportTasks = visibleTasks || []

  const selectedTask = useMemo(
    () => (visibleTasks || []).find(({ task }) => task.id === selectedTaskId)?.task || null,
    [selectedTaskId, visibleTasks],
  )

  const selectedTaskDistance = selectedTask ? distancesById?.[selectedTask.id] ?? null : null
  function handleSelectTask(taskOrTaskId) {
    const taskId = typeof taskOrTaskId === 'string' ? taskOrTaskId : taskOrTaskId?.id
    if (!taskId) return

    setSelectedTaskId(taskId)
    setMobileView('map')
  }

  function handleLocateTask(task) {
    handleSelectTask(task)
    setMobileView('map')
  }

  async function handleContact(task) {
    if (!task || task.status !== 'open' || task.created_by === currentUserId) {
      return
    }

    try {
      const conversationId = await createOrGetDirectConversation(task.created_by)
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      console.error('[OfferHelpMapLayout] could not open contact chat', error)
    }
  }

  async function handleToggleFavorite(task) {
    if (!task) return

    try {
      await toggleFavoriteMutation.mutateAsync(task)
    } catch (error) {
      console.error('[OfferHelpMapLayout] could not toggle favorite', error)
    }
  }

  return (
    <section className={styles.shell}>
      <TaskFiltersBar
        category={category}
        onCategoryChange={onCategoryChange}
        categories={categories}
        radius={radius}
        onRadiusChange={onRadiusChange}
        radiusOptions={radiusOptions}
        taskCount={taskCount}
        visibleCount={viewportTasks.length}
        eyebrow="Disponible para ayudar"
        title={title}
        lead={lead}
      />

      <div className={styles.mobileTabs} role="tablist" aria-label="Vista de tareas">
        <button type="button" className={mobileView === 'map' ? styles.mobileTabActive : styles.mobileTab} onClick={() => setMobileView('map')}>
          Mapa
        </button>
        <button type="button" className={mobileView === 'list' ? styles.mobileTabActive : styles.mobileTab} onClick={() => setMobileView('list')}>
          Lista
        </button>
      </div>

      <div className={styles.desktopGrid}>
        <section className={mobileView === 'list' ? `${styles.mapPane} ${styles.hiddenOnMobile}` : styles.mapPane}>
          <div className={styles.mapHeader}>
            <div>
              <p className="eyebrow">Solicitudes abiertas</p>
              <h2>Tareas abiertas cerca de ti</h2>
              <p className="muted">Selecciona una tarea, revisa el detalle y contacta solo si sigue abierta.</p>
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
              onTaskSelect={handleSelectTask}
            />
          </div>

        </section>

        <div className={mobileView === 'map' ? `${styles.panelPane} ${styles.hiddenOnMobile}` : styles.panelPane}>
          <TaskListPanel
            tasks={visibleTasks}
            visibleTasks={viewportTasks}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleLocateTask}
            onOpenDetail={(task) => navigate(`/task/${task.id}`)}
            onContact={handleContact}
            onToggleFavorite={handleToggleFavorite}
            favoriteTaskIds={favoriteTaskIds}
            currentUserId={currentUserId}
            loading={isLoading}
            error={error}
            locationLabel={location?.label || profile?.neighborhood || profile?.city || 'Tu zona'}
            onExpandRadius={() => onRadiusChange(nextRadiusOption)}
          />
        </div>
      </div>

      <TaskPreviewModal
        open={Boolean(selectedTask)}
        task={selectedTask}
        distanceKm={selectedTaskDistance}
        isFavorite={selectedTask ? favoriteTaskIds.includes(selectedTask.id) : false}
        currentUserId={currentUserId}
        onClose={() => setSelectedTaskId(null)}
        onOpenDetail={(task) => navigate(`/task/${task.id}`)}
        onContact={handleContact}
        onToggleFavorite={handleToggleFavorite}
        onLocateTask={handleLocateTask}
      />
    </section>
  )
}
