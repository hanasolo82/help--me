import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { signOut } from '../../services/authService'
import { cancelTask, publishTask } from '../../services/tasksService'
import { useHomeModals } from './hooks/useHomeModals'
import { useHomeFilters } from './hooks/useHomeFilters'
import { useHomeLocation } from './hooks/useHomeLocation'
import { useHomeTasks } from './hooks/useHomeTasks'
import { useChats } from '../../hooks/useChats'
import { readHelperHomeIntent, setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import HelperJourneyModal from '../../features/helper-onboarding/components/HelperJourneyModal'
import HomeView from './HomeView'
import {
  applyThemeToDocument,
  resolveThemePreference,
  setStoredThemePreference,
  THEME_DARK,
  THEME_LIGHT,
} from '../../shared/theme/themePreferences'

export default function HomeContainer() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const routeLocation = useLocation()

  const {
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    openChatsModal,
    closeChatsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  } = useHomeModals()
  const [helperJourneyOpen, setHelperJourneyOpen] = useState(false)
  const [myRequestsDrawerOpen, setMyRequestsDrawerOpen] = useState(false)
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
  const [themePreference, setThemePreference] = useState(() =>
    resolveThemePreference({
      isPrivateRoute: true,
      profileTheme: profile?.theme === THEME_DARK ? THEME_DARK : null,
    }),
  )
  const {
    visibleTasks,
    distancesById,
    isTasksLoading,
    tasksError,
    refetchTasks,
  } = useHomeTasks({
    profile,
    mode,
    category,
    radius,
    radiusEnabled: profile?.search_radius_enabled === true,
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

  const handleStartHelperOnboarding = useCallback(() => {
    setHelperJourneyOpen(true)
  }, [])

  const handleNeedHelpMode = useCallback(() => {
    setHelperHomeIntent('need')
    navigate('/home', { replace: true, state: { mode: 'need' } })
  }, [navigate])

  const handleOpenHelperMode = useCallback(() => {
    setHelperHomeIntent('help')
    navigate('/home', { replace: true, state: { mode: 'help' } })
  }, [navigate])

  const handleOpenFavorites = useCallback(() => {
    navigate('/profile', { state: { section: 'favorites' } })
  }, [navigate])

  const handleOpenSettings = useCallback(() => {
    navigate('/settings')
  }, [navigate])

  const handleOpenNotifications = useCallback(() => {
    navigate('/settings#notificaciones')
  }, [navigate])

  const handleOpenPrivacy = useCallback(() => {
    navigate('/settings#mapa-ubicacion')
  }, [navigate])

  const handleOpenHelp = useCallback(() => {
    navigate('/legal/community-guidelines')
  }, [navigate])

  const handleOpenMyRequests = useCallback(() => {
    setHelperHomeIntent('need')
    setMyRequestsDrawerOpen(true)
    navigate('/home', { replace: true, state: { mode: 'need' } })
  }, [navigate])

  const handleCloseMyRequests = useCallback(() => {
    setMyRequestsDrawerOpen(false)
  }, [])

  useEffect(() => {
    const nextTheme = resolveThemePreference({
      isPrivateRoute: true,
      profileTheme: profile?.theme === THEME_DARK ? THEME_DARK : null,
    })

    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setThemePreference(nextTheme)
      applyThemeToDocument(nextTheme)
    })

    return () => {
      cancelled = true
    }
  }, [profile?.theme])

  const handleThemeChange = useCallback((nextChecked) => {
    const nextTheme = nextChecked ? THEME_DARK : THEME_LIGHT
    setThemePreference(nextTheme)
    setStoredThemePreference(nextTheme)
    applyThemeToDocument(nextTheme)
  }, [])

  useEffect(() => {
    const routeMode = routeLocation.state?.mode
    const storedMode = readHelperHomeIntent()
    const nextMode = routeMode || storedMode || (profile?.helper_status === 'active' ? 'help' : 'need')

    if (nextMode === 'need' || nextMode === 'help') {
      setMode(nextMode)
    }
  }, [
    profile?.helper_status,
    routeLocation.state?.mode,
    setMode,
  ])

  useEffect(() => {
    if (!routeLocation.state?.resumeHelperOnboarding) return

    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setHelperJourneyOpen(true)
      setHelperHomeIntent('help')
    })

    return () => {
      cancelled = true
    }
  }, [routeLocation.state?.resumeHelperOnboarding])

  useEffect(() => {
    if (mode !== 'need' && mode !== 'help') return
    if (location || status !== 'idle') return

    requestLocation()
  }, [location, mode, requestLocation, status])

  return (
    <>
      <HomeView
        profile={profile}
        locationLabel={locationLabel}
        displayName={displayName}
        avatarUrl={profile?.avatar_url || null}
        userInitial={userInitial}
        onOpenHelper={handleOpenHelperMode}
        onOpenChats={openChatsModal}
        onOpenFavorites={handleOpenFavorites}
        onOpenMyRequests={isHelperMode ? undefined : handleOpenMyRequests}
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={handleOpenNotifications}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenHelp={handleOpenHelp}
        onOpenProfile={() => navigate('/profile')}
        onOpenNeedHelp={handleNeedHelpMode}
        onLogout={handleLogout}
        themePreference={themePreference}
        onThemeChange={handleThemeChange}
        isHelperActive={Boolean(profile?.helper_status === 'active')}
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
        onStartHelperOnboarding={handleStartHelperOnboarding}
        onNeedHelp={handleNeedHelpMode}
        requestsDrawerOpen={myRequestsDrawerOpen}
        onOpenRequestsDrawer={handleOpenMyRequests}
        onCloseRequestsDrawer={handleCloseMyRequests}
      />
      <HelperJourneyModal
        open={helperJourneyOpen}
        preferredStepKey={routeLocation.state?.preferredStep || null}
        onClose={() => setHelperJourneyOpen(false)}
        onFinish={() => {
          setHelperJourneyOpen(false)
          setHelperHomeIntent('help')
          navigate('/home', { replace: true, state: { mode: 'help' } })
        }}
      />
    </>
  )
}
