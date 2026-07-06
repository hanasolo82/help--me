import { MapPin, CalendarClock, Pencil, Map as MapIcon, Trash2 } from 'lucide-react'
import ActivityBadge from '../../../tasks/categories/ActivityBadge'
import { formatTaskAvailabilityShort } from '../../../tasks/availability/taskAvailability'
import styles from './PublishedRequestCard.module.css'

function getReadableLocation(task) {
  const label = task?.location_label || task?.zone || task?.location || ''
  return label.trim() || 'Zona del mapa'
}

/**
 * Tarjeta destacada de "Solicitud publicada" en la columna izquierda de /home.
 * Sustituye al banner plano: resume la solicitud (título, descripción, categoría,
 * lugar y cuándo), muestra el estado con un punto animado y ofrece acciones
 * secundarias. `justPublished` añade el momento de éxito (check dibujado).
 */
export default function PublishedRequestCard({
  task,
  justPublished = false,
  onViewOnMap,
  onEdit,
  onRetire,
  onDismiss,
  retirePending = false,
}) {
  if (!task) return null

  return (
    <section className={styles.card} aria-label="Tu solicitud publicada">
      {justPublished ? (
        <div className={styles.successRow} role="status">
          <svg className={styles.successCheck} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10.5" />
            <path d="M7.5 12.4l3 3 6-6.5" />
          </svg>
          <p className={styles.successCopy}>Solicitud publicada</p>
        </div>
      ) : null}

      <div className={styles.top}>
        <p className={styles.eyebrow}>Tu solicitud</p>
        <span className={styles.statusBadge}>
          <span className={styles.statusDot} aria-hidden="true" />
          Activa · Visible para vecinos
        </span>
        {onDismiss ? (
          <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Ocultar resumen">
            ×
          </button>
        ) : null}
      </div>

      <h3 className={styles.title}>{task.title}</h3>
      {task.description ? <p className={styles.description}>{task.description}</p> : null}

      <div className={styles.metaRow}>
        <ActivityBadge category={task.category} compact />
        <span className={styles.metaItem}>
          <MapPin aria-hidden="true" strokeWidth={2} />
          {getReadableLocation(task)}
        </span>
        <span className={styles.metaItem}>
          <CalendarClock aria-hidden="true" strokeWidth={2} />
          {formatTaskAvailabilityShort(task)}
        </span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.actionButton} onClick={() => onViewOnMap?.(task)}>
          <MapIcon aria-hidden="true" strokeWidth={2} />
          Ver en el mapa
        </button>
        <button type="button" className={styles.actionButton} onClick={() => onEdit?.(task)}>
          <Pencil aria-hidden="true" strokeWidth={2} />
          Editar
        </button>
        <button
          type="button"
          className={`${styles.actionButton} ${styles.actionDanger}`}
          onClick={() => onRetire?.(task)}
          disabled={retirePending}
        >
          <Trash2 aria-hidden="true" strokeWidth={2} />
          {retirePending ? 'Retirando…' : 'Retirar solicitud'}
        </button>
      </div>
    </section>
  )
}
