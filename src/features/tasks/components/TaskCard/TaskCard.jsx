import styles from "./TaskCard.module.css";

export default function TaskCard({ task, actionLabel = "Aceptar tarea", onAction }) {
  const userInitial = task.user?.name?.charAt(0) || 'H'
  const ratingLabel = task.user?.ratingCount
    ? `${task.user.rating} estrellas · ${task.user.ratingCount} valoraciones`
    : 'Sin valoraciones todavia'

  return (
    <article className={styles.card}>
      <div className={styles.userRow}>
        <div className={styles.avatarWrap}>
          <span>{userInitial}</span>
          {task.user?.avatar && <img src={task.user.avatar} alt={task.user.name} />}
        </div>

        <div>
          <strong>{task.user?.name || 'Usuario helpMe'}</strong>
          <p>{ratingLabel} · {task.user?.completedTasks || 0} tareas</p>
        </div>
      </div>

      <div className={styles.topSection}>
        <div>
          <h2 className={styles.title}>
            {task.title}
          </h2>

          <p className={styles.meta}>
            {task.distance} km · {task.urgency} · {task.category}
          </p>
        </div>

        <span className={styles.price}>
          {task.price} EUR
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
