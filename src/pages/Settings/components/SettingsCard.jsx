import styles from '../SettingsPage.module.css'

export default function SettingsCard({ eyebrow, title, description, accent = false, children }) {
  return (
    <section className={accent ? `${styles.card} ${styles.cardAccent}` : styles.card}>
      <header className={styles.cardHeader}>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
        {description && <span>{description}</span>}
      </header>
      {children}
    </section>
  )
}
