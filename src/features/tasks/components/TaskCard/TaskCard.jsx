import styles from "./TaskCard.module.css";

// Card de tarea conectada a Supabase. Lee campos directos del schema (price_cents, urgency, requester...).
export default function TaskCard({ task, distanceKm, actionLabel = "Aceptar tarea", onAction }) {
  const requester = task.requester || {}
  const userName = requester.full_name || requester.username || 'Usuario helpMe'
  const userInitial = userName.charAt(0).toUpperCase()
  const ratingLabel = requester.completed_tasks > 0
    ? `${requester.rating ?? 0} estrellas`
    : 'Sin valoraciones todavia'
  const completedTasks = requester.completed_tasks ?? 0
  const priceEuros = Math.round((task.price_cents ?? 0) / 100)
  const distanceLabel = Number.isFinite(distanceKm) ? `${distanceKm} km` : 'Distancia desconocida'

  return (
    <article className={styles.card}>
      <div className={styles.userRow}>
        <div className={styles.avatarWrap}>
          <span>{userInitial}</span>
          {requester.avatar_url && <img src={requester.avatar_url} alt={userName} />}
        </div>

        <div>
          <strong>{userName}</strong>
          <p>{ratingLabel} · {completedTasks} tareas</p>
        </div>
      </div>

      {task.image_url && (
        <img className={styles.taskImage} src={task.image_url} alt={task.title} loading="lazy" />
      )}

      <div className={styles.topSection}>
        <div>
          <h2 className={styles.title}>
            {task.title}
          </h2>

          <p className={styles.meta}>
            {distanceLabel} · {task.urgency} · {task.category}
          </p>
        </div>

        <span className={styles.price}>
          {priceEuros} EUR
        </span>
      </div>

      <p className={styles.description}>
        {task.description}
      </p>

      <button className={styles.button} onClick={onAction}>
        {actionLabel}
      </button>
    </article>
  );
}
