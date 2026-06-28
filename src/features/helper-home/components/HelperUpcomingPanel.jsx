import { useNavigate } from 'react-router-dom'
import HelperEmptyState from './HelperEmptyState'
import ActivityBadge from '../../tasks/categories/ActivityBadge'
import { formatTaskAvailabilityShort } from '../../tasks/availability/taskAvailability'
import styles from '../styles/helperHome.module.css'

function formatTaskAge(task) {
  const date = new Date(task?.published_at || task?.updated_at || task?.created_at || Date.now())
  if (Number.isNaN(date.getTime())) return 'Actualizada recientemente'

  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (elapsedMinutes < 60) return `Hace ${Math.max(1, elapsedMinutes)} min`

  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `Hace ${elapsedHours} h`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function formatTaskStatus(task) {
  if (task.status === 'assigned') return 'Asignada'
  if (task.status === 'in_progress') return 'En curso'
  return task.status
}

export default function HelperUpcomingPanel({ tasks = [], onOpenTask }) {
  const navigate = useNavigate()

  const visibleTasks = tasks.filter((task) => ['assigned', 'in_progress'].includes(task.status))

  return (
    <section className={styles.panel} aria-label="Próximas tareas">
      <div className={styles.panelTitle}>
        <h3>Próximas tareas</h3>
        <p>Solo lo que ya es tuyo.</p>
      </div>

      {visibleTasks.length === 0 ? (
        <HelperEmptyState
          title="Aún no tienes tareas próximas."
          description="Cuando te elijan para una solicitud, aparecerá aquí para seguirla sin perder contexto."
          actionLabel="Ver solicitudes abiertas"
          onAction={() => navigate('/home', { replace: true, state: { mode: 'help' } })}
        />
      ) : (
        <div className={styles.upcomingList}>
          {visibleTasks.slice(0, 4).map((task) => (
            <article key={task.id} className={styles.upcomingItem}>
              <div className={styles.upcomingRow}>
                <strong>{task.title}</strong>
                <span className={styles.statusPill}>{formatTaskStatus(task)}</span>
              </div>
              <div className={styles.upcomingTaskActivity}>
                <ActivityBadge category={task.category} compact />
                <span>{formatTaskAge(task)}</span>
                <span>{formatTaskAvailabilityShort(task)}</span>
              </div>
              <div className={styles.upcomingRow}>
                <p className={styles.upcomingMeta}>
                  {task.price ? `${Number(task.price)} EUR` : 'Sin precio definido'}
                </p>
                <button type="button" className="link-button" onClick={() => onOpenTask?.(task)}>
                  Ver detalle
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
