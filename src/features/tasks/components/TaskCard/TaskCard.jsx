import styles from "./TaskCard.module.css";

// Card de tarea conectada a Supabase. Las columnas siguen el esquema actual:
// id, title, description, price (numeric en euros), category, lat, lng, status, created_by, accepted_by.
export default function TaskCard({ task, distanceKm, actionLabel = "Aceptar tarea", onAction }) {
  const priceEuros = Number(task.price ?? 0)
  const distanceLabel = Number.isFinite(distanceKm) ? `${distanceKm} km` : 'Distancia desconocida'

  return (
    <article className={styles.card}>
      <div className={styles.topSection}>
        <div>
          <h2 className={styles.title}>
            {task.title}
          </h2>

          <p className={styles.meta}>
            {distanceLabel} · {task.category}
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
