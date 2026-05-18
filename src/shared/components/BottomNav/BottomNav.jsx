import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'
import { useBottomNavStore } from '../../../stores/useBottomNavStore'

const TOUCHED_KEY = 'helpMe:bottom-nav-touched'
const tabOrder = ['mapa', 'mensajes', 'configuracion']
const tabIndexByKey = tabOrder.reduce((acc, key, index) => {
  acc[key] = index
  return acc
}, {})
const tabByPath = {
  '/home': 'mapa',
  '/chats': 'mensajes',
  '/settings': 'configuracion',
}

const visiblePaths = new Set(['/home', '/chats', '/settings', '/create', '/profile'])

function TabItem({ className, href, children, onOpen, state, onSelect }) {
  if (onOpen) {
    return (
      <button
        className={className}
        type="button"
        onClick={() => {
          onSelect()
          onOpen()
        }}
      >
        {children}
      </button>
    )
  }

  return (
    <NavLink className={className} to={href} state={state} onClick={onSelect}>
      {children}
    </NavLink>
  )
}

// Barra inferior principal de la app.
export default function BottomNav() {
  const [selectedTab, setSelectedTab] = useState('')
  const [previousTab, setPreviousTab] = useState('')
  const [indicatorVersion, setIndicatorVersion] = useState(0)
  const [portalTarget] = useState(() => (typeof document !== 'undefined' ? document.body : null))
  const location = useLocation()
  const currentTabRef = useRef('')
  const onOpenMap = useBottomNavStore((state) => state.onOpenMap)
  const onOpenMessages = useBottomNavStore((state) => state.onOpenMessages)
  const onOpenSettings = useBottomNavStore((state) => state.onOpenSettings)

  function updateSelection(nextTab) {
    if (currentTabRef.current === nextTab) {
      setSelectedTab(nextTab)
      return
    }

    setPreviousTab(currentTabRef.current)
    currentTabRef.current = nextTab
    setSelectedTab(nextTab)
    setIndicatorVersion((current) => current + 1)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const touched = window.sessionStorage.getItem(TOUCHED_KEY)
    if (touched !== 'true') return

    updateSelection(tabByPath[location.pathname] || '')
  }, [location.pathname])

  function handleSelect(tabKey) {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(TOUCHED_KEY, 'true')
    }

    updateSelection(tabKey)
  }

  function getLinkClassName(tabKey) {
    return selectedTab === tabKey ? styles.active : styles.link
  }

  if (!visiblePaths.has(location.pathname)) {
    return null
  }

  if (!portalTarget) {
    return null
  }

  return createPortal(
    <nav
      className={styles.nav}
      aria-label="Navegacion principal"
      style={{
        '--tab-index': tabIndexByKey[selectedTab] ?? 0,
        '--prev-tab-index': tabIndexByKey[previousTab] ?? tabIndexByKey[selectedTab] ?? 0,
      }}
      data-selected={selectedTab || 'none'}
    >
      <span
        key={indicatorVersion}
        className={
          selectedTab
            ? `${styles.indicator} ${styles.indicatorVisible} ${styles.indicatorAnimating}`
            : styles.indicator
        }
        aria-hidden="true"
      />
      <TabItem
        className={getLinkClassName('mapa')}
        href="/home"
        state={{ openMap: true }}
        onOpen={onOpenMap}
        onSelect={() => handleSelect('mapa')}
      >
        Mapa
      </TabItem>
      <TabItem
        className={getLinkClassName('mensajes')}
        href="/chats"
        onOpen={onOpenMessages}
        onSelect={() => handleSelect('mensajes')}
      >
        Mensajes
      </TabItem>
      <TabItem
        className={getLinkClassName('configuracion')}
        href="/settings"
        onOpen={onOpenSettings}
        onSelect={() => handleSelect('configuracion')}
      >
        Configuracion
      </TabItem>
    </nav>,
    document.body,
  )
}
