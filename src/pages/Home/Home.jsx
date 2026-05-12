import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Home.module.css'
import TaskCard from '../../features/tasks/components/TaskCard/TaskCard'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import TaskMap from '../../features/map/components/TaskMap/TaskMap'
import { resolveUserLocation } from '../../services/locationService'
import { getTasks } from '../../services/usersApi'

// Opciones visibles en los filtros. Deben coincidir con las categorias de tareas.
const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
// Radios disponibles para filtrar feed y dibujar circulo en el mapa.
const radiusOptions = [1, 3, 5, 10]

export default function Home() {
  // mode es el switch principal del producto: ayudar o pedir ayuda.
  const [mode, setMode] = useState('help')
  const [category, setCategory] = useState('Todas')
  const [radius, setRadius] = useState(3)
  const [showMap, setShowMap] = useState(false)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const navigate = useNavigate()

  const isHelperMode = mode === 'help'
  // De momento lee del MVP local. Cuando conectemos Supabase, aqui cambiaremos el origen de datos.
  const tasks = useMemo(() => getTasks(), [])
  // Separa tareas de otros usuarios y tareas propias segun el modo activo.
  const modeTasks = tasks.filter((task) => (isHelperMode ? !task.owner : task.owner))
  // Aplica filtros de categoria y radio antes de renderizar cards y marcadores del mapa.
  const visibleTasks = modeTasks.filter((task) => {
    const matchesCategory = category === 'Todas' || task.category === category
    const matchesRadius = Number(task.distance) <= radius

    return matchesCategory && matchesRadius
  })

  // Abre el mapa y solicita ubicacion solo la primera vez para no repetir permisos sin necesidad.
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
            {location?.label || 'Zaragoza · Delicias'}
          </p>

          <h1 className={styles.logo}>
            helpMe
          </h1>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.landingButton} onClick={() => navigate('/')}>
            Landing
          </button>
          <button className={styles.avatar} onClick={() => navigate('/profile')} aria-label="Abrir perfil">
            M
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

      {!isHelperMode && (
        <button className={styles.publishButton} onClick={() => navigate('/create')}>
          Publicar tarea
        </button>
      )}

      <section className={styles.tasksContainer}>
        <div className={styles.sectionTitle}>
          <div>
            <h2>{isHelperMode ? 'Tareas cerca de ti' : 'Tus tareas activas'}</h2>
            <p>{radius} km de radio · {category}</p>
          </div>

          <div className={styles.titleActions}>
            <button className={styles.mapButton} onClick={openMap}>
              Mapa
            </button>
            <span>{visibleTasks.length}</span>
          </div>
        </div>

        <div className={styles.taskGrid}>
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              actionLabel={isHelperMode ? 'Aceptar tarea' : 'Ver estado'}
              onAction={() => navigate(`/task/${task.id}`)}
            />
          ))}
        </div>

        {visibleTasks.length === 0 && (
          <article className={styles.emptyState}>
            <h3>No hay tareas con estos filtros</h3>
            <p>Amplia el radio o cambia el tipo de actividad para ver mas oportunidades.</p>
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
              tasks={visibleTasks}
              userLocation={location}
              radiusKm={radius}
              onTaskSelect={(taskId) => navigate(`/task/${taskId}`)}
            />
          </section>
        </div>
      )}

      <BottomNav active="home" requester={!isHelperMode} />
    </main>
  )
}
