import styles from '../styles/profilePublicView.module.css'

export default function ProfileSectionNav({ sections = [], compact = false }) {
  const className = `${styles.sectionTabs} ${compact ? styles.sectionTabsCompact : ''}`.trim()

  return (
    <nav className={className} aria-label="Secciones del perfil">
      {sections.map((section) => (
        <a key={section.id} className={styles.sectionTab} href={`#${section.id}`}>
          <span>{section.label}</span>
        </a>
      ))}
    </nav>
  )
}
