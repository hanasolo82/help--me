import styles from './MyRequestsPanel.module.css'

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
          <span>Activas</span>
          <strong>{openTasks.length}</strong>
        </article>
        <article className={styles.countCard}>
          <span>Pendientes de confirmación</span>
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
              <p className="eyebrow">Última activa</p>
              <strong>{latestOpenTask.title}</strong>
              <p className="muted">{latestOpenTask.category}</p>
            </div>
            <span className={styles.featuredStatus}>Activa</span>
          </div>
          <p className={styles.featuredMeta}>
            {latestOpenTask.published_at || latestOpenTask.created_at ? new Intl.DateTimeFormat('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }).format(new Date(latestOpenTask.published_at || latestOpenTask.created_at)) : 'Sin fecha'}
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
