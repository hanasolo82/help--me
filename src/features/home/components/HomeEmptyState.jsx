import { Compass, Sparkles, CircleAlert } from 'lucide-react'
import styles from './HomeEmptyState.module.css'

const TONE_ICON = {
  neutral: Compass,
  positive: Sparkles,
  warning: CircleAlert,
}

/**
 * Empty state cuidado: icono en medallón, copy amable y hasta dos acciones
 * (primaria + secundaria). El tono elige icono y tinte del medallón.
 */
export default function HomeEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tone = 'neutral',
}) {
  const Icon = TONE_ICON[tone] || TONE_ICON.neutral

  return (
    <article className={`${styles.card} ${styles[tone] || ''}`.trim()}>
      <div className={styles.icon} aria-hidden="true">
        <Icon strokeWidth={1.7} />
      </div>
      <div className={styles.body}>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {(actionLabel && onAction) || (secondaryActionLabel && onSecondaryAction) ? (
        <div className={styles.actions}>
          {actionLabel && onAction ? (
            <button type="button" className="primary-action" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
          {secondaryActionLabel && onSecondaryAction ? (
            <button type="button" className="secondary-action" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
