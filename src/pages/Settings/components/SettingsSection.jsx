import SectionHeader from '../../../shared/ui/SectionHeader'
import styles from '../SettingsPage.module.css'

export default function SettingsSection({
  id,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
  children,
}) {
  return (
    <section id={id} className={styles.sectionCard}>
      <div className={styles.sectionHeaderRow}>
        <SectionHeader eyebrow={eyebrow} title={title} lead={description} titleClassName={styles.sectionTitle} />

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
