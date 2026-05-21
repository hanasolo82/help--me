import styles from './HomeEmptyState.module.css'

export default function HomeEmptyState({ title, description, actionLabel, onAction, tone = 'neutral' }) {
  return (
    <article className={`${styles.card} ${styles[tone] || ''}`.trim()}>
      <div className={styles.icon} aria-hidden="true">
        {tone === 'positive' ? '◎' : tone === 'warning' ? '!' : '•'}
      </div>
      <div className={styles.body}>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="primary-action" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </article>
  )
}
