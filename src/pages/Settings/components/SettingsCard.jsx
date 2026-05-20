import styles from '../SettingsPage.module.css'
import SectionHeader from '../../../shared/ui/SectionHeader'

export default function SettingsCard({ eyebrow, title, description, accent = false, children }) {
  return (
    <section className={accent ? `${styles.card} ${styles.cardAccent}` : styles.card}>
      <SectionHeader eyebrow={eyebrow} title={title} lead={description} titleClassName={styles.cardTitle} />
      {children}
    </section>
  )
}
