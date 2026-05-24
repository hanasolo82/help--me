import styles from '../styles/profilePublicView.module.css'

export default function ProfileEditableRow({ label, value, meta, actionLabel, onAction }) {
  return (
    <div className={styles.editableRow}>
      <div className={styles.editableRowCopy}>
        <span className={styles.editableRowLabel}>{label}</span>
        <strong className={styles.editableRowValue}>{value}</strong>
        {meta ? <span className={styles.editableRowMeta}>{meta}</span> : null}
      </div>

      {actionLabel && onAction ? (
        <button type="button" className={styles.editableRowAction} onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}
