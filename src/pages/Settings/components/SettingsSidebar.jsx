import { useEffect, useState } from 'react'
import styles from '../SettingsPage.module.css'

function getCurrentHash() {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace('#', '')
}

export default function SettingsSidebar({ items = [] }) {
  const [activeId, setActiveId] = useState(getCurrentHash)

  useEffect(() => {
    function handleHashChange() {
      setActiveId(getCurrentHash())
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange()

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarIntro}>
        <p className={styles.sidebarKicker}>HelpMe</p>
        <h2 className={styles.sidebarTitle}>Ajustes</h2>
        <p className={styles.sidebarLead}>Tu perfil, tu actividad y tu seguridad en una vista clara.</p>
      </div>

      <nav className={styles.sidebarNav} aria-label="Secciones de ajustes">
        {items.map((item) => {
          const isActive = item.id === activeId
          const className = [
            styles.sidebarItem,
            isActive ? styles.sidebarItemActive : '',
            item.disabled ? styles.sidebarItemDisabled : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <a key={item.id} className={className} href={`#${item.id}`} aria-current={isActive ? 'page' : undefined}>
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              <span className={styles.sidebarItemMeta}>{item.meta || ''}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
