import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTransitionNavigate } from '../../shared/navigation/usePageTransition'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { signOut } from '../../services/authService'
import {
  cancelTask,
  getMyTasks,
  getPendingTaskApplications,
  publishTask,
} from '../../services/tasksService'
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

function getAcceptedHelperName(task) {
  const profile = task?.accepted_profile || {}
  return profile.display_name || profile.full_name || profile.username || 'Un helper'
}

function getConversationSenderName(conversation, userId) {
  const participant = conversation?.participants?.find((item) => item.user_id !== userId)
  const profile = participant?.profile || conversation?.other_user || {}
  return profile.display_name || profile.full_name || profile.username || 'Alguien'
}

function getApplicationHelperName(application) {
  const profile = application?.helper_profile || {}
  return profile.display_name || profile.full_name || profile.username || 'Un helper'
}

function buildNotificationSummary(chats = [], userId, requesterTasks = [], pendingApplications = []) {
  if (!userId) {
    return {
      unreadMessageCount: 0,
      unreadConversationCount: 0,
      unreadConversations: [],
      interestedHelperCount: 0,
      interestedTasks: [],
      pendingConfirmationCount: 0,
      pendingConfirmationTasks: [],
    }
  }

  const unreadConversations = (chats || []).filter((chat) => isUnreadConversation(chat, userId))
  const unreadConversationSummaries = unreadConversations.map((conversation) => ({
    id: conversation.id,
    taskId: conversation.task_id || null,
    senderName: getConversationSenderName(conversation, userId),
    preview: conversation.latest_message?.deleted_at
      ? 'Mensaje eliminado'
      : conversation.latest_message?.body || conversation.latest_message?.content || 'Nuevo mensaje',
  }))
  const pendingConfirmationTasks = (requesterTasks || [])
    .filter((task) => task.status === 'assigned')
    .map((task) => ({
      id: task.id,
      title: task.title,
      helperName: getAcceptedHelperName(task),
    }))
  const tasksById = new Map((requesterTasks || []).map((task) => [task.id, task]))
  const interestedTasksById = new Map()

  for (const application of pendingApplications || []) {
    const task = tasksById.get(application.task_id)
    if (!task || interestedTasksById.has(task.id)) continue

    interestedTasksById.set(task.id, {
      id: task.id,
      title: task.title,
      helperName: getApplicationHelperName(application),
    })
  }
  const interestedTasks = [...interestedTasksById.values()]

  return {
    unreadMessageCount: unreadConversations.length,
    unreadConversationCount: unreadConversations.length,
    unreadConversations: unreadConversationSummaries,
    interestedHelperCount: pendingApplications.length,
    interestedTasks,
    pendingConfirmationCount: pendingConfirmationTasks.length,
    pendingConfirmationTasks,
  }
}

export default function HomeContainer() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  const transitionNavigate = useTransitionNavigate()
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
    refetchInterval: 15_000,
  })
  const openRequesterTaskIds = useMemo(
    () => (requesterTasksQuery.data || [])
      .filter((task) => task.status === 'open')
      .map((task) => task.id),
    [requesterTasksQuery.data],
  )
  const pendingApplicationsQuery = useQuery({
    queryKey: ['pending-task-applications', profile?.id, openRequesterTaskIds],
    queryFn: () => getPendingTaskApplications(openRequesterTaskIds),
    enabled: Boolean(profile?.id) && openRequesterTaskIds.length > 0,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
  const notificationSummary = useMemo(
    () => buildNotificationSummary(
      chats,
      user?.id,
      requesterTasksQuery.data || [],
      pendingApplicationsQuery.data || [],
    ),
    [chats, pendingApplicationsQuery.data, requesterTasksQuery.data, user?.id],
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
        transitionNavigate(`/task/${task.id}`)
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
    [clearPublishingTaskId, transitionNavigate, refetchTasks, setPublishingTaskId],
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

  const handleOpenChats = useCallback(
    (conversationId = null, taskId = null) => {
      const conversation = conversationId
        ? chats.find((chat) => chat.id === conversationId)
        : null
      const resolvedTaskId = taskId || conversation?.task_id || null

      if (resolvedTaskId) {
        navigate(`/task/${resolvedTaskId}`, {
          state: {
            openChat: true,
            conversationId,
            returnTo: '/home',
          },
        })
        return
      }

      if (conversationId) {
        navigate(`/chat/${conversationId}`, { state: { returnTo: '/chats' } })
        return
      }

      openChatsModal()
    },
    [chats, navigate, openChatsModal],
  )

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

  const handleReviewAcceptedTask = useCallback(
    (taskId) => {
      if (taskId) {
        navigate(`/task/${taskId}`)
        return
      }

      setHelperHomeIntent('need')
      setMyRequestsDrawerOpen(true)
      navigate('/home', { replace: true, state: { mode: 'need' } })
    },
    [navigate],
  )

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
        onOpenChats={handleOpenChats}
        onOpenFavorites={handleOpenFavorites}
        onOpenMyRequests={isHelperMode ? undefined : handleOpenMyRequests}
        onOpenSettings={handleOpenSettings}
        onOpenNotifications={handleOpenNotifications}
        notificationSummary={notificationSummary}
        onReviewAcceptedTask={handleReviewAcceptedTask}
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
