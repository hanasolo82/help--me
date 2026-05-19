import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { signOut } from '../../services/authService'
import { cancelTask, publishTask } from '../../services/tasksService'
import { useHomeModals } from './hooks/useHomeModals'
import { useHomeFilters } from './hooks/useHomeFilters'
import { useHomeLocation } from './hooks/useHomeLocation'
import { useHomeTasks } from './hooks/useHomeTasks'
import { useChats } from '../../hooks/useChats'
import HomeView from './HomeView'

export default function HomeContainer() {
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
  } = useHomeModals()
  const {
    mode,
    category,
    radius,
    setMode,
    setCategory,
    setRadius,
    isHelperMode,
    helperTitle,
    helperSubtitle,
    categories,
    radiusOptions,
  } = useHomeFilters(profile)
  const {
    location,
    status,
    error,
    requestLocation,
    clearLocation,
    displayName,
    userInitial,
    showApproxLocation,
    locationLabel,
    userAvatarUrl,
  } = useHomeLocation(profile)
  const {
    visibleTasks,
    distancesById,
    isTasksLoading,
    tasksError,
    refetchTasks,
  } = useHomeTasks({
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

  useEffect(() => {
    if (routeLocation.state?.mode === 'need') {
      setMode('need')
      navigate('/home', { replace: true, state: null })
      return
    }

    if (routeLocation.state?.openMap && mode !== 'need') {
      setMode('help')
      setShowLocationPanel(true)
      setShowMap(true)
      if (!location && status !== 'loading') {
        requestLocation()
      }
      navigate('/home', { replace: true, state: null })
    }
  }, [
    location,
    navigate,
    mode,
    requestLocation,
    routeLocation.state,
    setMode,
    setShowLocationPanel,
    setShowMap,
    status,
  ])

  const openMap = useCallback(() => {
    if (mode === 'need') {
      return
    }

    setMode('help')
    closeChatsModal()
    closeSettingsModal()
    closeTaskChat()
    setShowLocationPanel(true)
    setShowMap(true)

    if (!location && status !== 'loading') {
      requestLocation()
    }
  }, [
    closeChatsModal,
    closeSettingsModal,
    closeTaskChat,
    location,
    mode,
    requestLocation,
    setMode,
    setShowLocationPanel,
    setShowMap,
    status,
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

  const handleCloseMap = useCallback(() => {
    setShowMap(false)
  }, [setShowMap])

  const handleDismissLocationPanel = useCallback(() => {
    setShowLocationPanel(false)
  }, [setShowLocationPanel])

  const handleClearLocation = useCallback(() => {
    clearLocation()
  }, [clearLocation])

  useEffect(() => {
    if (mode !== 'need' && mode !== 'help') return
    if (location || status !== 'idle') return

    requestLocation()
  }, [location, mode, requestLocation, status])

  return (
    <HomeView
      profile={profile}
      locationLabel={locationLabel}
      displayName={displayName}
      avatarUrl={profile?.avatar_url || null}
      userInitial={userInitial}
      onOpenChats={openChatsModal}
      onOpenSettings={openSettingsModal}
      onOpenProfile={() => navigate('/profile')}
      onLogout={handleLogout}
      mode={mode}
      onModeChange={setMode}
      category={category}
      onCategoryChange={setCategory}
      radius={radius}
      onRadiusChange={setRadius}
      helperTitle={helperTitle}
      helperSubtitle={helperSubtitle}
      isHelperMode={isHelperMode}
      categories={categories}
      radiusOptions={radiusOptions}
      onOpenMap={openMap}
      visibleTasks={visibleTasks}
      isTasksLoading={isTasksLoading}
      tasksError={tasksError}
      distancesById={distancesById}
      currentUserId={user?.id}
      expandedTaskIds={expandedTaskIds}
      publishingTaskId={publishingTaskId}
      onToggleTaskDetails={toggleExpandedTask}
      onPublishTask={handlePublishTask}
      onCancelTask={handleCancelTask}
      onOpenTaskChat={openTaskChat}
      onEditTask={handleEditTask}
      showMap={showMap}
      showLocationPanel={showLocationPanel}
      location={location}
      locationStatus={status}
      locationError={error}
      onRequestNeedLocation={requestLocation}
      showApproxLocation={showApproxLocation}
      userAvatarUrl={userAvatarUrl}
      radiusKm={radius}
      onCloseMap={handleCloseMap}
      onRequestLocation={requestLocation}
      onClearLocation={handleClearLocation}
      onDismissLocationPanel={handleDismissLocationPanel}
      chats={chats}
      isChatsLoading={isChatsLoading}
      chatsError={chatsError}
      showChatsModal={showChatsModal}
      onCloseChatsModal={closeChatsModal}
      showTaskChatModal={showTaskChatModal}
      activeTaskChat={activeTaskChat}
      onCloseTaskChat={closeTaskChat}
    />
  )
}
