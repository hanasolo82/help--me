import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Home.module.css'
import TaskCard from '../../features/tasks/components/TaskCard/TaskCard'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import TaskMap from '../../features/map/components/TaskMap/TaskMap'
import { distanceKm, resolveUserLocation } from '../../services/locationService'
import { cancelTask, canEditTask, getMyTasks, getOpenTasks, publishTask } from '../../services/tasksService'
import { useAuth } from '../../contexts/useAuth'

// Filtros visibles. Las categorias coinciden EXACTAMENTE con las del schema y tasksService.
const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
const radiusOptions = [1, 3, 5, 10, 50]

export default function Home() {
  const { profile } = useAuth()
  const routeLocation = useLocation()
  const [mode, setMode] = useState(routeLocation.state?.mode === 'need' ? 'need' : 'help')
  const [category, setCategory] = useState('Todas')
  const [radius, setRadius] = useState(10)
  const [showMap, setShowMap] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [tasksState, setTasksState] = useState({ queryKey: '', tasks: [], error: '' })
  const [publishingTaskId, setPublishingTaskId] = useState(null)
  const [expandedTaskIds, setExpandedTaskIds] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    if (routeLocation.state?.mode === 'need') {
      setMode('need')
      navigate('/home', { replace: true, state: null })
    }
  }, [navigate, routeLocation.state])

  const isHelperMode = mode === 'help'
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

  async function openMap() {
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
  }

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
          <button className={styles.landingButton} onClick={() => navigate('/')}>
            Salir
          </button>
          <button className={styles.avatar} onClick={() => navigate('/profile')} aria-label="Abrir perfil">
            {profile?.full_name?.charAt(0).toUpperCase() || '?'}
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
              onClick={isHelperMode ? openMap : () => navigate('/create')}
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
        <div className={styles.mapLayer} role="dialog" aria-modal="true" aria-labelledby="map-title">
          <section className={styles.mapModal}>
            <header className={styles.mapHeader}>
              <div>
                <p className={styles.mapKicker}>Localizacion</p>
                <h2 id="map-title">Trabajos cerca de ti</h2>
              </div>
              <button onClick={() => setShowMap(false)} aria-label="Cerrar mapa">
                ×
              </button>
            </header>

            <div className={styles.permissionPanel}>
              <strong>
                {locationStatus === 'loading' && 'Solicitando ubicacion...'}
                {locationStatus === 'ready' && `Ubicacion activa: ${location.label}`}
                {locationStatus === 'error' && 'No se pudo activar la ubicacion.'}
                {locationStatus === 'idle' && 'Activa tu ubicacion para calcular trabajos cercanos.'}
              </strong>
              <p>
                En movil, acepta el permiso del navegador. Si lo bloqueaste, activalo desde ajustes del sitio y vuelve
                a abrir el mapa. Si falla, usamos GeoJS para una ubicacion aproximada por IP.
              </p>
              {locationStatus === 'error' && (
                <button className={styles.mapButton} onClick={openMap}>
                  Reintentar
                </button>
              )}
            </div>

            <TaskMap
              tasks={visibleTasks.map((item) => item.task)}
              userLocation={location}
              radiusKm={radius}
              distances={distancesById}
              onTaskSelect={(taskId) => navigate(`/task/${taskId}`)}
            />
          </section>
        </div>
      )}

      <BottomNav active="home" requester={!isHelperMode} />
    </main>
  )
}
