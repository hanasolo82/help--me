import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { signOut } from '../../services/authService'
import { cancelTask, getMyTasks, publishTask } from '../../services/tasksService'
import { searchLocationAutocomplete } from '../../features/onboarding/services/locationAutocompleteService'
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

function getParticipantForUser(conversation, userId) {
  return conversation?.participants?.find((participant) => participant.user_id === userId) || null
}

function isUnreadConversation(conversation, userId) {
  const latestMessage = conversation?.latest_message
  if (!latestMessage || latestMessage.sender_id === userId) return false

  const participant = getParticipantForUser(conversation, userId)
  const lastReadAt = participant?.last_read_at
  if (!lastReadAt) return true

  return new Date(latestMessage.created_at || 0).getTime() > new Date(lastReadAt).getTime()
}

function buildNotificationSummary(chats = [], userId, requesterTasks = []) {
  if (!userId) {
    return {
      unreadMessageCount: 0,
      unreadConversationCount: 0,
      pendingPaymentCount: 0,
    }
  }

  const unreadConversations = (chats || []).filter((chat) => isUnreadConversation(chat, userId))
  const pendingPaymentCount = (requesterTasks || []).filter((task) => task.status === 'assigned').length

  return {
    unreadMessageCount: unreadConversations.length,
    unreadConversationCount: unreadConversations.length,
    pendingPaymentCount,
  }
}

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
    setMode,
    setCategory,
    isHelperMode,
    categories,
  } = useHomeFilters(profile)
  const {
    location,
    profileLocation,
    status,
    error,
    requestLocation,
    displayName,
    userInitial,
    locationLabel,
    userAvatarUrl,
  } = useHomeLocation(profile)
  const [helperLocationPreference, setHelperLocationPreference] = useState({
    source: 'profile',
    location: null,
  })
  const [requesterSearchLocation, setRequesterSearchLocation] = useState(null)
  const [helperZoneSearch, setHelperZoneSearch] = useState('')
  const [helperZoneSearchStatus, setHelperZoneSearchStatus] = useState('idle')
  const [helperZoneSearchMessage, setHelperZoneSearchMessage] = useState('')
  const helperSearchLocation = useMemo(() => {
    if (helperLocationPreference.source === 'search') {
      return helperLocationPreference.location
    }

    return profileLocation || null
  }, [helperLocationPreference, profileLocation])
  const helperMapLocation = helperSearchLocation
  const activeLocation = isHelperMode ? helperSearchLocation || location : requesterSearchLocation || location
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
    location: activeLocation,
  })
  const {
    chats,
    isLoading: isChatsLoading,
    error: chatsError,
  } = useChats()
  const requesterTasksQuery = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: () => getMyTasks(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 15_000,
  })
  const notificationSummary = useMemo(
    () => buildNotificationSummary(chats, user?.id, requesterTasksQuery.data || []),
    [chats, requesterTasksQuery.data, user?.id],
  )

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

  const handleZoneSearchChange = useCallback((value) => {
    setHelperZoneSearch(value)

    if (!value.trim()) {
      setHelperZoneSearchStatus('idle')
      setHelperZoneSearchMessage('')
    }
  }, [])

  const handleZoneSearchSubmit = useCallback(async () => {
    const query = helperZoneSearch.trim()

    if (!query) {
      if (isHelperMode) {
        setHelperLocationPreference({ source: 'profile', location: null })
      } else {
        setRequesterSearchLocation(null)
      }
      setHelperZoneSearchStatus('idle')
      setHelperZoneSearchMessage('')
      return
    }

    setHelperZoneSearchStatus('loading')
    setHelperZoneSearchMessage(`Buscando "${query}"...`)

    try {
      const results = await searchLocationAutocomplete(query)
      const match = results[0]

      if (!match) {
        setHelperZoneSearchStatus('error')
        setHelperZoneSearchMessage('No se encontró esa zona')
        return
      }

      const label = match.formattedAddress || match.city || query
      const nextLocation = {
        lat: match.lat,
        lng: match.lng,
        label,
        source: 'search',
      }

      if (isHelperMode) {
        setHelperLocationPreference({
          source: 'search',
          location: nextLocation,
        })
      } else {
        setRequesterSearchLocation(nextLocation)
      }
      setHelperZoneSearchStatus('success')
      setHelperZoneSearchMessage(`Mostrando ${label}`)
    } catch (error) {
      console.error('[HomeContainer] zone search failed', error)
      setHelperZoneSearchStatus('error')
      setHelperZoneSearchMessage(error?.message || 'No se encontró esa zona')
    }
  }, [helperZoneSearch, isHelperMode])

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
    if (mode !== 'need') return
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
        notificationSummary={notificationSummary}
        onOpenPrivacy={handleOpenPrivacy}
        onOpenHelp={handleOpenHelp}
        onOpenProfile={() => navigate('/profile')}
        onOpenNeedHelp={handleNeedHelpMode}
        onLogout={handleLogout}
        themePreference={themePreference}
        onThemeChange={handleThemeChange}
        isHelperActive={Boolean(profile?.helper_status === 'active')}
        zoneSearch={helperZoneSearch}
        zoneSearchStatus={helperZoneSearchStatus}
        zoneSearchMessage={helperZoneSearchMessage}
        onZoneSearchChange={handleZoneSearchChange}
        onZoneSearchSubmit={handleZoneSearchSubmit}
        category={category}
        onCategoryChange={setCategory}
        isHelperMode={isHelperMode}
        categories={categories}
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
        location={activeLocation}
        locationStatus={status}
        locationError={error}
        onRequestNeedLocation={requestLocation}
        helperLocationSource={helperLocationPreference.source}
        helperMapLocation={helperMapLocation}
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
