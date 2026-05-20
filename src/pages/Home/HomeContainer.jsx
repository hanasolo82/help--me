import { useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

  const {
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
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
    categories,
    radiusOptions,
  } = useHomeFilters(profile)
  const {
    location,
    status,
    error,
    requestLocation,
    displayName,
    userInitial,
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
      isHelperMode={isHelperMode}
      categories={categories}
      radiusOptions={radiusOptions}
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
      location={location}
      locationStatus={status}
      locationError={error}
      onRequestNeedLocation={requestLocation}
      userAvatarUrl={userAvatarUrl}
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
