import { useEffect, useState } from 'react'
import styles from '../styles/profilePublicView.module.css'

function getCurrentHash() {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace('#', '')
}

export default function ProfileSectionTabs({ sections = [], compact = false }) {
  const [activeSection, setActiveSection] = useState(getCurrentHash)

  useEffect(() => {
    function handleHashChange() {
      setActiveSection(getCurrentHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const className = `${styles.sectionTabs} ${compact ? styles.sectionTabsCompact : ''}`.trim()

  return (
    <nav className={className} aria-label="Secciones del perfil">
      {sections.map((section) => {
        const isActive = activeSection === section.id
        const itemClassName = `${styles.sectionTab} ${isActive ? styles.sectionTabActive : ''}`.trim()

        return (
          <a
            key={section.id}
            className={itemClassName}
            href={`#${section.id}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span>{section.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
