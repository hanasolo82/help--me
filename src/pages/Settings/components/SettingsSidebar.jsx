import { useEffect, useState } from 'react'
import styles from '../SettingsPage.module.css'

function getCurrentHash() {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace('#', '')
}

function scrollToSection(id, behavior = 'smooth') {
  const target = document.getElementById(id)
  if (!target) return false

  target.scrollIntoView({ behavior, block: 'start' })
  return true
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

  // Deep links (/settings#notificaciones): el router no hace scroll al ancla
  // por sí solo, así que lo hacemos al montar, cuando las secciones ya existen.
  useEffect(() => {
    const initialHash = getCurrentHash()
    if (!initialHash) return undefined

    const frameId = window.requestAnimationFrame(() => {
      scrollToSection(initialHash, 'auto')
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  // Click en la sidebar: marca activo Y desplaza a la sección (antes solo se
  // marcaba la pestaña y el contenido se quedaba en Perfil, QA).
  function handleNavigate(event, id) {
    event.preventDefault()
    setActiveId(id)
    window.history.replaceState(window.history.state, '', `#${id}`)
    scrollToSection(id)
  }

  return (
    <aside className={styles.sidebar}>
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
            <a
              key={item.id}
              className={className}
              href={`#${item.id}`}
              aria-current={isActive ? 'page' : undefined}
              onClick={(event) => handleNavigate(event, item.id)}
            >
              <span className={styles.sidebarItemLabel}>{item.label}</span>
              <span className={styles.sidebarItemMeta}>{item.meta || ''}</span>
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
