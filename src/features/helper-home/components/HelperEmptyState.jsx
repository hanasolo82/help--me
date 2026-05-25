import styles from '../styles/helperHome.module.css'

export default function HelperEmptyState({ title, description, note, actionLabel, onAction }) {
  return (
    <article className={styles.empty}>
      <strong>{title}</strong>
      <p>{description}</p>
      {note ? <span className={styles.emptyNote}>{note}</span> : null}
      {actionLabel && onAction ? (
        <button type="button" className={styles.emptyAction} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </article>
  )
}
