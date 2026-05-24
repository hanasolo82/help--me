import SectionHeader from '../../../shared/ui/SectionHeader'
import styles from '../styles/profilePublicView.module.css'

export default function ProfileContentSection({
  id,
  eyebrow,
  title,
  lead,
  children,
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <section id={id} className={styles.sectionCard}>
      <div className={styles.sectionHeaderRow}>
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          lead={lead}
          titleClassName={styles.sectionTitle}
          compact={compact}
        />

        {actionLabel && onAction ? (
          <button type="button" className={styles.sectionAction} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>

      {children}
    </section>
  )
}
