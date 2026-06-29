import styles from './MyRequestsPanel.module.css'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import ActivityBadge from '../../../tasks/categories/ActivityBadge'
import { getTaskStatusHint, getTaskStatusLabel } from '../../../tasks/utils/taskStatusLabels'

export default function MyRequestsPanel({
  tasks = [],
  loading = false,
  error = '',
  onOpenDrawer,
  onPublishNew,
}) {
  if (loading) {
    return (
      <section className={styles.panel}>
        <p className="muted">Cargando tus solicitudes...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={styles.panel}>
        <p className="auth-message error">{error}</p>
      </section>
    )
  }

  const openTasks = tasks.filter((task) => task.status === 'open')
  const pendingConfirmationTasks = tasks.filter((task) => task.status === 'assigned')
  const inProgressTasks = tasks.filter((task) => task.status === 'in_progress')
  const historyTasks = tasks.filter((task) => ['completed', 'closed', 'cancelled'].includes(task.status))
  const latestOpenTask = openTasks[0] || null

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <p className="eyebrow">Mis solicitudes</p>
          <h2>Resumen rápido</h2>
          <p className="muted">El mapa sigue siendo el protagonista. El historial completo vive dentro del drawer.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={onOpenDrawer}>
            Ver todas
          </button>
          <button type="button" className="primary-action" onClick={onPublishNew}>
            Publicar nueva
          </button>
        </div>
      </div>

      <div className={styles.countRow}>
        <article className={styles.countCard}>
          <span>Publicadas</span>
          <strong>{openTasks.length}</strong>
        </article>
        <article className={styles.countCard}>
          <span>Ofertas pendientes</span>
          <strong>{pendingConfirmationTasks.length}</strong>
        </article>
        <article className={styles.countCard}>
          <span>En curso</span>
          <strong>{inProgressTasks.length}</strong>
        </article>
        <article className={styles.countCard}>
          <span>Historial</span>
          <strong>{historyTasks.length}</strong>
        </article>
      </div>

      {latestOpenTask ? (
        <article className={styles.featuredTask}>
          <div className={styles.featuredHeader}>
            <div>
              <p className="eyebrow">Última publicada</p>
              <strong>{latestOpenTask.title}</strong>
              <div className={styles.featuredActivity}>
                <ActivityBadge category={latestOpenTask.category} compact />
              </div>
              <div className={styles.featuredStatusEditorial}>
                <span>{getTaskStatusLabel(latestOpenTask.status)}</span>
                <p>{getTaskStatusHint({ status: latestOpenTask.status, applicationCount: latestOpenTask.application_count })}</p>
              </div>
            </div>
          </div>
          <p className={styles.featuredMeta}>
            {latestOpenTask.published_at || latestOpenTask.created_at ? new Intl.DateTimeFormat('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date(latestOpenTask.published_at || latestOpenTask.created_at)) : 'Sin fecha'}
            {' · '}
            {formatTaskAvailabilityShort(latestOpenTask)}
          </p>
        </article>
      ) : (
        <article className={styles.emptyFeatured}>
          <strong>Aún no hay solicitudes activas</strong>
          <p className="muted">Cuando publiques una, aparecerá aquí y en el mapa.</p>
        </article>
      )}
    </section>
  )
}
