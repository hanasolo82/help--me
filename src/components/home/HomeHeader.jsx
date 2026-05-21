import { useEffect, useRef, useState } from 'react'
import styles from '../../pages/Home/Home.module.css'

export default function HomeHeader({
  locationLabel,
  displayName,
  avatarUrl,
  userInitial,
  onOpenHelper,
  onOpenChats,
  onOpenSettings,
  onOpenProfile,
  onLogout,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setConfirmLogoutOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  function handleAction(action) {
    setMenuOpen(false)
    action?.()
  }

  function handleRequestLogout() {
    setMenuOpen(false)
    setConfirmLogoutOpen(true)
  }

  function handleConfirmLogout() {
    setConfirmLogoutOpen(false)
    onLogout?.()
  }

  return (
    <>
      <header className={styles.header}>
        <div>
          <p className={styles.location}>
            {locationLabel}
          </p>

          <h1 className={styles.logo}>
            helpMe
          </h1>

          <p className="muted">
            Hola, {displayName}
          </p>
        </div>

      <div className={styles.headerActions}>
        {onOpenHelper ? (
          <button type="button" className={styles.helperLink} onClick={onOpenHelper}>
            Ayudar
          </button>
        ) : null}

        <button type="button" className={styles.avatar} onClick={onOpenProfile} aria-label="Abrir perfil">
          {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : userInitial}
        </button>

          <div className={styles.menuWrap} ref={menuRef}>
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Abrir menú de acciones"
            >
              ⋮
            </button>

            {menuOpen ? (
              <div className={styles.menuDropdown} role="menu" aria-label="Acciones del home">
                <button type="button" className={styles.menuItem} onClick={() => handleAction(onOpenChats)}>
                  Chats
                </button>
                <button type="button" className={styles.menuItem} onClick={() => handleAction(onOpenSettings)}>
                  Ajustes
                </button>
                {onLogout ? (
                  <button type="button" className={styles.menuItem} onClick={handleRequestLogout}>
                    Salir
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {confirmLogoutOpen ? (
        <div className={styles.logoutOverlay} role="presentation" onClick={() => setConfirmLogoutOpen(false)}>
          <div
            className={styles.logoutModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-description"
            onClick={(event) => event.stopPropagation()}
          >
            <p className={styles.logoutKicker}>Salir</p>
            <h2 id="logout-modal-title">¿Quieres cerrar sesión?</h2>
            <p id="logout-modal-description" className="muted">
              Puedes volver a entrar cuando quieras. Si sales ahora, tendrás que identificarte de nuevo para continuar.
            </p>

            <div className={styles.logoutActions}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => setConfirmLogoutOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={handleConfirmLogout}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
