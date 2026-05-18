import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Home.module.css'
import { useAuth } from '../../contexts/useAuth'
import { getAvatarInitial } from '../../utils/avatar'
import { signOut } from '../../services/authService'
import { cancelTask, publishTask } from '../../services/tasksService'
import { useHomeUiStore } from '../../stores/useHomeUiStore'
import { useBottomNavStore } from '../../stores/useBottomNavStore'
import { useTaskFiltersStore } from '../../stores/useTaskFiltersStore'
import { useUserLocation } from '../../hooks/useUserLocation'
import { useTasks } from '../../hooks/useTasks'
import { useChats } from '../../hooks/useChats'
import HomeHeader from '../../components/home/HomeHeader'
import ModeSwitcher from '../../components/home/ModeSwitcher'
import CategoryFilter from '../../components/home/CategoryFilter'
import RadiusFilter from '../../components/home/RadiusFilter'
import HomeMap from '../../components/home/HomeMap'
import TaskFeed from '../../components/home/TaskFeed'
import ChatsModal from '../../components/home/ChatsModal'
import TaskChatModal from '../../components/home/TaskChatModal'

// Filtros visibles. Las categorias coinciden EXACTAMENTE con las del schema y tasksService.
const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
const radiusOptions = [1, 3, 5, 10, 50]

export default function Home() {
  const { profile, user } = useAuth()
  const routeLocation = useLocation()
  const navigate = useNavigate()

  const {
    showMap,
    showLocationPanel,
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    setShowMap,
    setShowLocationPanel,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
    closeSettingsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  } = useHomeUiStore()
  const setBottomNavActions = useBottomNavStore((state) => state.setActions)
  const clearBottomNavActions = useBottomNavStore((state) => state.clearActions)

  const { mode, category, radius, setMode, setCategory, setRadius } = useTaskFiltersStore()
  const { location, status: locationStatus, error: locationError, requestLocation, clearLocation } = useUserLocation()
  const {
    visibleTasks,
    distancesById,
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks,
  } = useTasks({
    mode,
    category,
    radius,
    location,
  })
  const {
    chats,
    isLoading: isChatsLoading,
    error: chatsError,
  } = useChats()

  const isHelperMode = mode === 'help'
  const displayName = profile?.display_name || profile?.full_name || profile?.username || 'helpMe'
  const userInitial = getAvatarInitial(displayName)
  const showApproxLocation = profile?.show_approx_location ?? true

  useEffect(() => {
    if (Number.isFinite(profile?.search_radius_km)) {
      setRadius(profile.search_radius_km)
    }
  }, [profile?.search_radius_km, setRadius])

  useEffect(() => {
    if (routeLocation.state?.mode === 'need') {
      setMode('need')
      navigate('/home', { replace: true, state: null })
      return
    }

    if (routeLocation.state?.openMap) {
      setMode('help')
      setShowLocationPanel(true)
      setShowMap(true)
      if (!location && locationStatus !== 'loading') {
        requestLocation()
      }
      navigate('/home', { replace: true, state: null })
    }
  }, [
    location,
    locationStatus,
    navigate,
    requestLocation,
    routeLocation.state,
    setMode,
    setShowLocationPanel,
    setShowMap,
  ])

  const openMap = useCallback(() => {
    setMode('help')
    closeChatsModal()
    closeSettingsModal()
    closeTaskChat()
    setShowLocationPanel(true)
    setShowMap(true)

    if (!location && locationStatus !== 'loading') {
      requestLocation()
    }
  }, [
    location,
    locationStatus,
    requestLocation,
    setMode,
    setShowLocationPanel,
    setShowMap,
    closeChatsModal,
    closeSettingsModal,
    closeTaskChat,
  ])

  const handleLogout = useCallback(async () => {
    try {
      await signOut()
    } finally {
      window.location.replace('/')
    }
  }, [])

  const handlePublishTask = useCallback(
    async (task) => {
      if (task.status !== 'draft') {
        navigate(`/task/${task.id}`)
        return
      }

      setPublishingTaskId(task.id)

      try {
        await publishTask(task.id)
        await refetchTasks()
      } catch (error) {
        console.error(error)
      } finally {
        clearPublishingTaskId()
      }
    },
    [clearPublishingTaskId, navigate, refetchTasks, setPublishingTaskId],
  )

  const handleCancelTask = useCallback(
    async (task) => {
      try {
        await cancelTask(task.id)
        await refetchTasks()
      } catch (error) {
        console.error(error)
      }
    },
    [refetchTasks],
  )

  const handleEditTask = useCallback(
    (task) => {
      navigate(`/create?taskId=${task.id}`)
    },
    [navigate],
  )

  const handleOpenCreateTask = useCallback(() => {
    navigate('/create')
  }, [navigate])

  const handleCloseMap = useCallback(() => {
    setShowMap(false)
  }, [setShowMap])

  const handleDismissLocationPanel = useCallback(() => {
    setShowLocationPanel(false)
  }, [setShowLocationPanel])

  const handleClearLocation = useCallback(() => {
    clearLocation()
  }, [clearLocation])

  const helperTitle = isHelperMode ? 'Tareas cerca de ti' : 'Tareas solicitadas'
  const helperSubtitle = isHelperMode
    ? `${radius} km · ${category}`
    : 'Publica cada borrador cuando quieras mostrarlo'

  useEffect(() => {
    setBottomNavActions({
      onOpenMap: openMap,
      onOpenMessages: openChatsModal,
      onOpenSettings: openSettingsModal,
    })

    return () => {
      clearBottomNavActions()
    }
  }, [clearBottomNavActions, openChatsModal, openMap, openSettingsModal, setBottomNavActions])

  return (
    <main className={styles.home}>
      <HomeHeader
        locationLabel={location?.label || profile?.neighborhood || 'Activa tu ubicacion'}
        displayName={displayName}
        avatarUrl={profile?.avatar_url || null}
        userInitial={userInitial}
        onOpenChats={openChatsModal}
        onOpenSettings={openSettingsModal}
        onOpenProfile={() => navigate('/profile')}
        onLogout={handleLogout}
      />

      <ModeSwitcher mode={mode} onChange={setMode} />

      <section className={styles.filters} aria-label="Filtros de tareas">
        <CategoryFilter category={category} onChange={setCategory} options={categories} />
        <RadiusFilter radius={radius} onChange={setRadius} options={radiusOptions} />
      </section>

      <TaskFeed
        title={helperTitle}
        subtitle={helperSubtitle}
        actionLabel={isHelperMode ? 'Mapa' : 'Nueva tarea'}
        onAction={isHelperMode ? openMap : handleOpenCreateTask}
        tasks={visibleTasks}
        loading={isTasksLoading}
        error={tasksError}
        count={visibleTasks.length}
        isHelperMode={isHelperMode}
        currentUserId={user?.id}
        expandedTaskIds={expandedTaskIds}
        publishingTaskId={publishingTaskId}
        distancesById={distancesById}
        onToggleTaskDetails={toggleExpandedTask}
        onPublishTask={handlePublishTask}
        onCancelTask={handleCancelTask}
        onOpenTaskChat={openTaskChat}
        onEditTask={handleEditTask}
      />

      <HomeMap
        open={showMap}
        showLocationPanel={showLocationPanel}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        showApproxLocation={showApproxLocation}
        userAvatarUrl={profile?.map_avatar_url || profile?.avatar_url || null}
        userInitial={userInitial}
        radiusKm={radius}
        tasks={visibleTasks}
        distancesById={distancesById}
        onClose={handleCloseMap}
        onRequestLocation={requestLocation}
        onClearLocation={handleClearLocation}
        onDismissLocationPanel={handleDismissLocationPanel}
      />

      <ChatsModal
        open={showChatsModal}
        chats={chats}
        loading={isChatsLoading}
        error={chatsError}
        currentUserId={user?.id}
        onClose={closeChatsModal}
      />

      <TaskChatModal
        key={showTaskChatModal ? activeTaskChat?.id || 'task-chat' : 'task-chat-closed'}
        open={showTaskChatModal}
        task={activeTaskChat}
        onClose={closeTaskChat}
      />

    </main>
  )
}
