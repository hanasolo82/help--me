import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Home.module.css'
import TaskCard from '../../features/tasks/components/TaskCard/TaskCard'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import TaskMap from '../../features/map/components/TaskMap/TaskMap'
import { resolveMapAvatarUrl } from '../../assets/map-avatars'
import {
  deleteMessage,
  getMessages,
  getMyChats,
  getOrCreateChatByTaskId,
  sendMessage,
  updateMessage,
  subscribeToMessages,
} from '../../services/chatService'
import { distanceKm, resolveUserLocation } from '../../services/locationService'
import { signOut } from '../../services/authService'
import { cancelTask, canEditTask, getMyTasks, getOpenTasks, publishTask } from '../../services/tasksService'
import { useAuth } from '../../contexts/useAuth'
import { getAvatarInitial } from '../../utils/avatar'
import { createOptimisticMessage, markOptimisticMessageFailed } from '../../features/chat/utils/optimisticMessages'
import MessageList from '../../components/chat/MessageList'

// Filtros visibles. Las categorias coinciden EXACTAMENTE con las del schema y tasksService.
const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
const radiusOptions = [1, 3, 5, 10, 50]

export default function Home() {
  const { profile, user } = useAuth()
  const routeLocation = useLocation()
  const [mode, setMode] = useState(routeLocation.state?.mode === 'need' ? 'need' : 'help')
  const [category, setCategory] = useState('Todas')
  const [radius, setRadius] = useState(10)
  const [showMap, setShowMap] = useState(false)
  const [showLocationPanel, setShowLocationPanel] = useState(true)
  const [showChatsModal, setShowChatsModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showTaskChatModal, setShowTaskChatModal] = useState(false)
  const [activeTaskChat, setActiveTaskChat] = useState(null)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [tasksState, setTasksState] = useState({ queryKey: '', tasks: [], error: '' })
  const [chatsState, setChatsState] = useState({ loading: false, chats: [], error: '' })
  const [taskChatState, setTaskChatState] = useState({ status: 'idle', chat: null, messages: [], error: '' })
  const [taskChatMessage, setTaskChatMessage] = useState('')
  const [sendingTaskChatMessage, setSendingTaskChatMessage] = useState(false)
  const [publishingTaskId, setPublishingTaskId] = useState(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState({})
  const taskChatMessagesEndRef = useRef(null)
  const navigate = useNavigate()

  const isHelperMode = mode === 'help'
  const displayName = profile?.display_name || profile?.full_name || profile?.username || 'helpMe'
  const userInitial = getAvatarInitial(displayName)
  const showApproxLocation = profile?.show_approx_location ?? true
  const tasksQueryKey = `${isHelperMode ? 'help' : 'need'}:${category}`
  const tasks = tasksState.tasks
  const loading = tasksState.queryKey !== tasksQueryKey
  const error = loading ? '' : tasksState.error

  // Carga tareas desde Supabase cada vez que cambia el modo o la categoria.
  useEffect(() => {
    let cancelled = false

    const promise = isHelperMode
      ? getOpenTasks({ category })
      : getMyTasks({ role: 'requester' })

    promise
      .then((data) => {
        if (cancelled) return
        setTasksState({ queryKey: tasksQueryKey, tasks: data || [], error: '' })
      })
      .catch((err) => {
        if (cancelled) return
        setTasksState({
          queryKey: tasksQueryKey,
          tasks: [],
          error: err.message || 'No se pudieron cargar las tareas.',
        })
      })

    return () => {
      cancelled = true
    }
  }, [isHelperMode, category, tasksQueryKey])

  useEffect(() => {
    if (!showChatsModal) return

    let cancelled = false
    setChatsState({ loading: true, chats: [], error: '' })

    getMyChats()
      .then((data) => {
        if (!cancelled) {
          setChatsState({ loading: false, chats: data || [], error: '' })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setChatsState({
            loading: false,
            chats: [],
            error: err.message || 'No se pudieron cargar tus chats.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [showChatsModal])

  useEffect(() => {
    if (!showTaskChatModal || !activeTaskChat) {
      return undefined
    }

    let cancelled = false
    let unsubscribe = null

    async function bootstrapTaskChat() {
      setTaskChatState({ status: 'loading', chat: null, messages: [], error: '' })
      setTaskChatMessage('')

      try {
        const chat = await getOrCreateChatByTaskId(activeTaskChat.id)
        if (cancelled) return

        const history = await getMessages(chat.id)
        if (cancelled) return

        setTaskChatState({ status: 'ready', chat, messages: history || [], error: '' })
        unsubscribe = subscribeToMessages(chat.id, {
          onInsert: (newMessage) => {
            setTaskChatState((current) => {
              if (current.chat?.id !== chat.id) return current
              if (current.messages.some((message) => message.id === newMessage.id)) return current
              return {
                ...current,
                messages: [...current.messages, newMessage],
              }
            })
          },
          onUpdate: (updatedMessage) => {
            setTaskChatState((current) => ({
              ...current,
              messages: current.messages.map((message) =>
                message.id === updatedMessage.id ? updatedMessage : message,
              ),
            }))
          },
          onDelete: (deletedMessage) => {
            setTaskChatState((current) => ({
              ...current,
              messages: current.messages.filter((message) => message.id !== deletedMessage.id),
            }))
          },
        })
      } catch (err) {
        if (cancelled) return
        setTaskChatState({
          status: 'error',
          chat: null,
          messages: [],
          error: err.message || 'No se pudo abrir el chat.',
        })
      }
    }

    bootstrapTaskChat()

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [activeTaskChat, showTaskChatModal])

  useEffect(() => {
    taskChatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [showTaskChatModal, taskChatState.messages])

  // Calcula distancias respecto a la ubicacion del usuario (si la tiene) o la deja como null.
  const tasksWithDistance = useMemo(() => {
    return tasks.map((task) => ({
      task,
      distance: location ? distanceKm(location, { latitude: task.lat, longitude: task.lng }) : null,
    }))
  }, [tasks, location])

  // Aplica filtro de radio solo si tenemos ubicacion. Sin ubicacion mostramos todo.
  const visibleTasks = tasksWithDistance.filter(({ task, distance }) => {
    if (!isHelperMode) return true
    if (category !== 'Todas' && task.category !== category) return false
    if (location && Number.isFinite(distance) && distance > radius) return false
    return true
  })

  const distancesById = useMemo(() => {
    const map = {}
    for (const item of visibleTasks) {
      if (Number.isFinite(item.distance)) map[item.task.id] = item.distance
    }
    return map
  }, [visibleTasks])

  const sortedChats = useMemo(() => {
    return [...chatsState.chats].sort(
      (a, b) => new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at),
    )
  }, [chatsState.chats])

  function toggleTaskDetails(taskId) {
    setExpandedTaskIds((current) => ({
      ...current,
      [taskId]: !current[taskId],
    }))
  }

  async function handlePublishTask(task) {
    if (task.status !== 'draft') {
      navigate(`/task/${task.id}`)
      return
    }

    setPublishingTaskId(task.id)
    setTasksState((current) => ({
      ...current,
      error: '',
    }))

    try {
      await publishTask(task.id)
      const refreshedTasks = await getMyTasks({ role: 'requester' })
      setTasksState({
        queryKey: tasksQueryKey,
        tasks: refreshedTasks,
        error: '',
      })
    } catch (err) {
      setTasksState((current) => ({
        ...current,
        error: err.message || 'No se pudo publicar la tarea.',
      }))
    } finally {
      setPublishingTaskId(null)
    }
  }

  async function handleCancelTask(task) {
    try {
      await cancelTask(task.id)
      setTasksState((current) => ({
        ...current,
        tasks: current.tasks.filter((item) => item.id !== task.id),
      }))
      setExpandedTaskIds((current) => {
        const next = { ...current }
        delete next[task.id]
        return next
      })
    } catch (err) {
      setTasksState((current) => ({
        ...current,
        error: err.message || 'No se pudo cancelar la tarea.',
      }))
    }
  }

  async function handleLogout() {
    try {
      await signOut()
    } finally {
      window.location.replace('/')
    }
  }

  function clearLocation() {
    if (locationStatus === 'loading') {
      return
    }

    // Solo ocultamos el panel; conservamos location/locationStatus para no perder
    // la ubicacion ya concedida ni el radio calculado.
    setShowLocationPanel(false)
  }

  function closeMap() {
    setShowMap(false)
  }

  function closeMessagesModal() {
    setShowChatsModal(false)
  }

  function openSettingsModal() {
    setShowMap(false)
    setShowChatsModal(false)
    setShowSettingsModal(true)
  }

  function closeSettingsModal() {
    setShowSettingsModal(false)
  }

  function closeTaskChatModal() {
    setShowTaskChatModal(false)
    setActiveTaskChat(null)
    setTaskChatState({ status: 'idle', chat: null, messages: [], error: '' })
    setTaskChatMessage('')
  }

  function openTaskChatModal(task) {
    setShowMap(false)
    setShowChatsModal(false)
    setShowSettingsModal(false)
    setActiveTaskChat(task)
    setShowTaskChatModal(true)
  }

  async function handleSendTaskChatMessage(event) {
    event.preventDefault()

    if (!taskChatState.chat || !taskChatMessage.trim() || sendingTaskChatMessage) {
      return
    }

    setSendingTaskChatMessage(true)
    setTaskChatState((current) => ({ ...current, error: '' }))
    const tempMessage = createOptimisticMessage({
      conversationId: taskChatState.chat.id,
      senderId: user?.id,
      body: taskChatMessage.trim(),
    })
    setTaskChatState((current) => ({
      ...current,
      messages: [...current.messages, tempMessage],
    }))
    setTaskChatMessage('')

    try {
      const sentMessage = await sendMessage(taskChatState.chat.id, taskChatMessage, tempMessage.client_temp_id)
      setTaskChatState((current) => ({
        ...current,
        messages: current.messages.map((message) =>
          message.id === tempMessage.id || message.client_temp_id === tempMessage.client_temp_id
            ? { ...sentMessage, client_temp_id: tempMessage.client_temp_id }
            : message,
        ),
      }))
    } catch (err) {
      setTaskChatState((current) => ({
        ...current,
        error: err.message || 'No se pudo enviar el mensaje.',
        messages: current.messages.map((message) =>
          message.id === tempMessage.id || message.client_temp_id === tempMessage.client_temp_id
            ? markOptimisticMessageFailed(message, err.message || 'No se pudo enviar el mensaje.')
            : message,
        ),
      }))
    } finally {
      setSendingTaskChatMessage(false)
    }
  }

  async function handleEditTaskChatMessage(messageId, nextContent) {
    const updated = await updateMessage(messageId, nextContent)
    setTaskChatState((current) => ({
      ...current,
      messages: current.messages.map((message) => (message.id === updated.id ? updated : message)),
    }))
    return updated
  }

  async function handleDeleteTaskChatMessage(messageId) {
    await deleteMessage(messageId)
    setTaskChatState((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== messageId),
    }))
  }

  const openMap = useCallback(async () => {
    setShowChatsModal(false)
    setShowSettingsModal(false)
    setShowLocationPanel(true)
    setShowMap(true)

    if (location || locationStatus === 'loading') {
      return
    }

    setLocationStatus('loading')

    try {
      const resolvedLocation = await resolveUserLocation()
      setLocation(resolvedLocation)
      setLocationStatus('ready')
    } catch {
      setLocationStatus('error')
    }
  }, [location, locationStatus])

  const handleMapButtonClick = useCallback(() => {
    setMode('help')
    openMap()
  }, [openMap])

  useEffect(() => {
    if (Number.isFinite(profile?.search_radius_km)) {
      setRadius(profile.search_radius_km)
    }
  }, [profile?.search_radius_km])

  useEffect(() => {
    if (routeLocation.state?.mode === 'need') {
      setMode('need')
      navigate('/home', { replace: true, state: null })
      return
    }

    if (routeLocation.state?.openMap) {
      setMode('help')
      openMap()
      navigate('/home', { replace: true, state: null })
    }
  }, [navigate, routeLocation.state, openMap])

  return (
    <main className={styles.home}>
      <header className={styles.header}>
        <div>
          <p className={styles.location}>
            {location?.label || profile?.neighborhood || 'Activa tu ubicacion'}
          </p>

          <h1 className={styles.logo}>
            helpMe
          </h1>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.landingButton} onClick={handleLogout}>
            Salir
          </button>
          <button type="button" className={styles.avatar} onClick={() => navigate('/profile')} aria-label="Abrir perfil">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt={displayName} />
              : userInitial}
          </button>
        </div>
      </header>

      <section className={styles.toggle} aria-label="Cambiar intencion">
        <button
          className={isHelperMode ? styles.activeButton : styles.inactiveButton}
          onClick={() => setMode('help')}
        >
          Ayudar
        </button>

        <button
          className={!isHelperMode ? styles.activeButtonNeed : styles.inactiveButton}
          onClick={() => setMode('need')}
        >
          Necesito ayuda
        </button>
      </section>

      <section className={styles.filters} aria-label="Filtros de tareas">
        <label>
          <span>Actividad</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Radio maximo</span>
          <select value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
            {radiusOptions.map((item) => (
              <option key={item} value={item}>
                {item} km
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={styles.tasksContainer}>
        <div className={styles.sectionTitle}>
          <div>
            <h2>{isHelperMode ? 'Tareas cerca de ti' : 'Tareas solicitadas'}</h2>
            <p>{isHelperMode ? `${radius} km · ${category}` : 'Publica cada borrador cuando quieras mostrarlo'}</p>
          </div>

          <div className={styles.titleActions}>
            <button
              className={styles.mapButton}
              onClick={isHelperMode ? handleMapButtonClick : () => navigate('/create')}
            >
              {isHelperMode ? 'Mapa' : 'Nueva tarea'}
            </button>
            <span>{visibleTasks.length}</span>
          </div>
        </div>

        {loading && <p className="muted">Cargando tareas...</p>}
        {error && !loading && <p className="auth-message error">{error}</p>}

        <div className={styles.taskGrid}>
          {visibleTasks.map(({ task, distance }) => {
            const isDraftTask = !isHelperMode && task.status === 'draft'

            return (
              <TaskCard
                key={task.id}
                task={task}
                distanceKm={distance}
                showDistance={isHelperMode}
                showCancelAction={!isHelperMode && ['draft', 'open', 'assigned', 'in_progress'].includes(task.status)}
                onCancelAction={() => handleCancelTask(task)}
                showEditAction={!isHelperMode && canEditTask(task)}
                onEditAction={() => navigate(`/create?taskId=${task.id}`)}
                showChatAction={
                  (isHelperMode && task.status === 'open' && task.created_by !== user?.id) ||
                  (!isHelperMode && Boolean(task.accepted_by) && ['assigned', 'in_progress', 'completed'].includes(task.status))
                }
                onChatAction={() => openTaskChatModal(task)}
                expanded={Boolean(expandedTaskIds[task.id])}
                primaryActionLabel={
                  isHelperMode
                    ? (expandedTaskIds[task.id] ? 'Ocultar' : 'Ver detalle')
                    : isDraftTask
                      ? publishingTaskId === task.id
                        ? 'Publicando...'
                        : 'Publicar tarea'
                      : null
                }
                primaryActionVariant="primary"
                primaryActionDisabled={!isHelperMode && publishingTaskId === task.id}
                onPrimaryAction={() => {
                  if (isHelperMode) {
                    toggleTaskDetails(task.id)
                    return
                  }

                  if (isDraftTask) {
                    handlePublishTask(task)
                  }
                }}
                secondaryActionLabel={isHelperMode ? null : (expandedTaskIds[task.id] ? 'Ocultar' : 'Ver detalle')}
                secondaryActionVariant="link"
                onSecondaryAction={() => toggleTaskDetails(task.id)}
              />
            )
          })}
        </div>

        {!loading && !error && visibleTasks.length === 0 && (
          <article className={styles.emptyState}>
            <h3>{isHelperMode ? 'No hay tareas con estos filtros' : 'Aun no tienes tareas solicitadas'}</h3>
            <p>
              {isHelperMode
                ? 'Amplia el radio o cambia el tipo de actividad para ver mas oportunidades.'
                : 'Pulsa "Nueva tarea" para pedir tu primera ayuda.'}
            </p>
          </article>
        )}
      </section>

      {showMap && (
        <div
          className={styles.mapLayer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="map-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMap()
          }}
        >
          <section className={styles.mapModal}>
            <header className={styles.mapHeader}>
              <div>
                <p className={styles.mapKicker}>Localizacion</p>
                <h2 id="map-title">Trabajos cerca de ti</h2>
              </div>
              <button onClick={closeMap} aria-label="Cerrar mapa">
                ×
              </button>
            </header>

            {showLocationPanel && (
              <div className={styles.permissionPanel}>
                <div className={styles.permissionStatusRow}>
                <strong>
                  {locationStatus === 'loading' && 'Solicitando ubicacion...'}
                    {locationStatus === 'ready' && (showApproxLocation ? `Ubicacion activa: ${location.label}` : 'Ubicacion activa')}
                    {locationStatus === 'error' && 'No se pudo activar la ubicacion.'}
                    {locationStatus === 'idle' && 'Activa tu ubicacion para calcular trabajos cercanos.'}
                </strong>
                  <button
                    className={styles.locationCloseButton}
                    onClick={clearLocation}
                    aria-label="Cerrar ubicacion"
                    aria-disabled={locationStatus === 'loading'}
                  >
                    ×
                  </button>
                </div>
                <p>
                  Activa permisos de ubicación para una ubicacion mas precisa.
                </p>
                {locationStatus === 'error' && (
                  <button className={styles.mapButton} onClick={openMap}>
                    Reintentar
                  </button>
                )}
              </div>
            )}

            <TaskMap
              tasks={visibleTasks.map((item) => item.task)}
              userLocation={location}
              radiusKm={radius}
              distances={distancesById}
              userAvatarUrl={resolveMapAvatarUrl(profile?.map_avatar_url) || profile?.avatar_url || null}
              userInitial={userInitial}
              onTaskSelect={(taskId) => navigate(`/task/${taskId}`)}
            />
          </section>
        </div>
      )}

      {showChatsModal && (
        <div
          className={styles.mapLayer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="messages-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeMessagesModal()
          }}
        >
          <section className={styles.mapModal}>
            <header className={styles.mapHeader}>
              <div>
                <p className={styles.mapKicker}>Conversaciones</p>
                <h2 id="messages-title">Tus chats</h2>
              </div>
              <button onClick={closeMessagesModal} aria-label="Cerrar mensajes">
                ×
              </button>
            </header>

            {chatsState.loading && <p className="muted">Cargando...</p>}
            {chatsState.error && <p className="auth-message error">{chatsState.error}</p>}

            {!chatsState.loading && !chatsState.error && sortedChats.length === 0 && (
              <article className="empty-state">
                <h3>Todavia no tienes chats</h3>
                <p>Cuando aceptes una tarea o alguien acepte la tuya, aparecera aqui.</p>
              </article>
            )}

            <ul className="chat-list">
              {sortedChats.map((chat) => {
                const counterpartProfile =
                  chat.other_user || chat.participants?.find((participant) => participant.user_id !== user?.id)?.profile
                const name =
                  counterpartProfile?.display_name ||
                  counterpartProfile?.full_name ||
                  counterpartProfile?.username ||
                  'Vecino'
                const initial = name.charAt(0).toUpperCase()
                const preview = chat.latest_message?.deleted_at
                  ? 'Mensaje eliminado'
                  : chat.latest_message?.body || chat.latest_message?.content || 'Sin mensajes todavia'

                return (
                  <li key={chat.id}>
                    <button
                      className="chat-list-item"
                      onClick={() => {
                        closeMessagesModal()
                        navigate(`/chat/${chat.id}`)
                      }}
                    >
                      <span className="avatar-small">{initial}</span>
                      <span>
                        <strong>{name}</strong>
                        <p>{preview}</p>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}

      {showSettingsModal && (
        <div
          className={styles.mapLayer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSettingsModal()
          }}
        >
          <section className={styles.mapModal}>
            <header className={styles.mapHeader}>
              <div>
                <p className={styles.mapKicker}>Configuracion</p>
                <h2 id="settings-title">Ajustes</h2>
              </div>
              <button onClick={closeSettingsModal} aria-label="Cerrar configuracion">
                ×
              </button>
            </header>

            <section className="detail-panel">
              <h2>Ajustes rapidos</h2>
              <p className="muted">
                La pagina completa te permite editar perfil, apariencia, mapa y notificaciones en una sola vista.
              </p>
              <button
                className="primary-action"
                onClick={() => {
                  closeSettingsModal()
                  navigate('/settings')
                }}
              >
                Abrir configuracion
              </button>
            </section>
          </section>
        </div>
      )}

      {showTaskChatModal && activeTaskChat && (
        <div
          className="task-chat-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-task-chat-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeTaskChatModal()
            }
          }}
        >
          <section className="task-chat-modal">
            <header className="task-chat-header">
              <div>
                <p className="eyebrow">Mensaje</p>
                <h2 id="home-task-chat-title">
                  {activeTaskChat.creator_profile?.display_name ||
                    activeTaskChat.creator_profile?.full_name ||
                    activeTaskChat.creator_profile?.username ||
                    'Vecino'}
                </h2>
                <p className="muted">{activeTaskChat.title}</p>
              </div>
              <button className="icon-button" onClick={closeTaskChatModal} aria-label="Cerrar chat">
                ×
              </button>
            </header>

            {taskChatState.status === 'loading' && <p className="muted" style={{ padding: '16px' }}>Abriendo chat...</p>}
            {taskChatState.status === 'error' && <p className="auth-message error" style={{ margin: '16px' }}>{taskChatState.error}</p>}

            {taskChatState.status === 'ready' && (
              <>
                <section className="task-chat-messages" aria-live="polite">
                  <MessageList
                    messages={taskChatState.messages}
                    currentUserId={user?.id}
                    onEditMessage={handleEditTaskChatMessage}
                    onDeleteMessage={handleDeleteTaskChatMessage}
                  />
                  <div ref={taskChatMessagesEndRef} />
                </section>

                <form className="task-chat-composer" onSubmit={handleSendTaskChatMessage}>
                  <input
                    value={taskChatMessage}
                    onChange={(event) => setTaskChatMessage(event.target.value)}
                    placeholder="Escribe un mensaje"
                    maxLength={1200}
                    disabled={sendingTaskChatMessage}
                  />
                  <button
                    type="submit"
                    className="primary-action"
                    disabled={sendingTaskChatMessage || !taskChatMessage.trim()}
                  >
                    Enviar
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      <BottomNav onOpenMap={handleMapButtonClick} onOpenSettings={openSettingsModal} />
    </main>
  )
}
