import { useState } from 'react'
import styles from '../../pages/Home/Home.module.css'
import AnimatedDropdown from '../../shared/ui/AnimatedDropdown'
import ThemeSwitch from '../../shared/components/ThemeSwitch/ThemeSwitch'
import { THEME_DARK } from '../../shared/theme/themePreferences'

export default function HomeHeader({
  displayName,
  avatarUrl,
  userInitial,
  zoneSearch = '',
  zoneSearchStatus = 'idle',
  zoneSearchMessage = '',
  onZoneSearchChange,
  onZoneSearchSubmit,
  onOpenHelper,
  onOpenNeedHelp,
  onOpenChats,
  onOpenFavorites,
  onOpenMyRequests,
  onOpenSettings,
  onOpenNotifications,
  notificationSummary,
  onReviewAcceptedTask,
  onOpenPrivacy,
  onOpenHelp,
  onOpenProfile,
  onLogout,
  themePreference,
  onThemeChange,
  isHelperMode = false,
  isHelperActive = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false)

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

  function handleZoneSearchSubmit(event) {
    event.preventDefault()
    onZoneSearchSubmit?.()
  }

  const modeLabel = isHelperMode ? 'Necesito ayuda' : 'Ayudar'
  const modeAction = isHelperMode ? onOpenNeedHelp : onOpenHelper
  const showZoneSearch = Boolean(onZoneSearchChange || onZoneSearchSubmit)
  const unreadMessageCount = notificationSummary?.unreadMessageCount || 0
  const unreadConversationCount = notificationSummary?.unreadConversationCount || 0
  const pendingConfirmationCount = notificationSummary?.pendingConfirmationCount || 0
  const pendingConfirmationTasks = notificationSummary?.pendingConfirmationTasks || []
  const firstPendingConfirmationTask = pendingConfirmationTasks[0] || null
  const totalNotificationCount = unreadMessageCount + pendingConfirmationCount
  const notificationBadge = totalNotificationCount > 99 ? '99+' : String(totalNotificationCount)

  const primaryItems = [
    { label: 'Mi perfil', action: onOpenProfile },
    { label: 'Mensajes', action: onOpenChats },
    { label: 'Favoritos', action: onOpenFavorites },
    { label: 'Mis solicitudes', action: onOpenMyRequests },
    { label: modeLabel, action: modeAction },
  ].filter((item) => Boolean(item.action))

  const accountItems = [
    { label: 'Ajustes', action: onOpenSettings },
    { label: 'Notificaciones', action: onOpenNotifications },
    { label: 'Mapa y ubicación', action: onOpenPrivacy },
    { label: 'Ayuda', action: onOpenHelp },
  ].filter((item) => Boolean(item.action))

  const helperItems = isHelperActive
    ? [
        { label: 'Panel de ayudante', action: onOpenHelper },
        { label: 'Solicitudes disponibles', action: onOpenHelper },
      ].filter((item) => Boolean(item.action))
    : []

  return (
    <>
      <header className={`${styles.header} ${showZoneSearch ? styles.headerWithSearch : ''}`}>
        <div className={styles.headerIdentity}>
          <h1 className={styles.logo}>helpMe</h1>
          <p className="muted">Hola, {displayName}</p>
        </div>

        {showZoneSearch ? (
          <div className={styles.headerSearch} aria-label="Buscar zona del mapa">
            <form className={styles.headerSearchForm} onSubmit={handleZoneSearchSubmit}>
              <div className={styles.headerSearchInputWrap}>
                <input
                  id="helper-map-zone-search"
                  className={styles.headerSearchInput}
                  type="search"
                  placeholder="Buscar zonas del mapa"
                  aria-label="Buscar zonas del mapa"
                  value={zoneSearch}
                  onChange={(event) => onZoneSearchChange?.(event.target.value)}
                  spellCheck="false"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className={styles.headerSearchButton}
                  aria-label="Buscar zona"
                  aria-busy={zoneSearchStatus === 'loading'}
                >
                  <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                    <path d="M10.5 4a6.5 6.5 0 1 0 4.13 11.52l4.42 4.43 1.42-1.42-4.43-4.42A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" fill="currentColor" />
                  </svg>
                </button>
              </div>
              {zoneSearchMessage ? (
                <p className={styles.headerSearchMessage} data-status={zoneSearchStatus}>
                  {zoneSearchMessage}
                </p>
              ) : null}
            </form>
          </div>
        ) : null}

        <div className={styles.headerActions}>
          <ThemeSwitch checked={themePreference === THEME_DARK} onCheckedChange={onThemeChange} />

          {onOpenHelper ? (
            <button type="button" className={styles.helperLink} onClick={modeAction}>
              {modeLabel}
            </button>
          ) : null}

          <AnimatedDropdown
            isOpen={notificationsOpen}
            onOpenChange={setNotificationsOpen}
            align="end"
            width={320}
            portal
            trigger={
              <button type="button" className={styles.notificationButton} aria-label="Notificaciones">
                <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
                  <path
                    d="M12 3a5 5 0 0 0-5 5v2.65c0 .76-.23 1.5-.66 2.12L5.1 14.55A1.55 1.55 0 0 0 6.38 17h11.24a1.55 1.55 0 0 0 1.28-2.43l-1.24-1.8A3.72 3.72 0 0 1 17 10.65V8a5 5 0 0 0-5-5Zm0 19a3 3 0 0 0 2.83-2h-5.66A3 3 0 0 0 12 22Z"
                    fill="currentColor"
                  />
                </svg>
                {totalNotificationCount > 0 ? <span className={styles.notificationBadge}>{notificationBadge}</span> : null}
              </button>
            }
          >
            <AnimatedDropdown.Group title="Notificaciones">
              <div className={styles.notificationPanel}>
                {pendingConfirmationCount > 0 ? (
                  <>
                    <p className={styles.notificationTitle}>
                      {firstPendingConfirmationTask
                        ? `${firstPendingConfirmationTask.helperName} ha aceptado tu tarea “${firstPendingConfirmationTask.title}”.`
                        : pendingConfirmationCount === 1
                          ? 'Un helper ha aceptado tu tarea.'
                          : `${pendingConfirmationCount} helpers han aceptado tus tareas.`}
                    </p>
                    <p className={styles.notificationMeta}>Decide si quieres confirmar y pagar o rechazar esta oferta.</p>
                  </>
                ) : null}

                {unreadMessageCount > 0 ? (
                  <>
                    <p className={styles.notificationTitle}>
                      Tienes {unreadMessageCount} {unreadMessageCount === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}
                    </p>
                    <p className={styles.notificationMeta}>
                      {unreadConversationCount === 1
                        ? 'En 1 conversación pendiente.'
                        : `En ${unreadConversationCount} conversaciones pendientes.`}
                    </p>
                  </>
                ) : pendingConfirmationCount === 0 ? (
                  <>
                    <p className={styles.notificationTitle}>No tienes notificaciones nuevas</p>
                    <p className={styles.notificationMeta}>Cuando lleguen mensajes pendientes, aparecerán aquí.</p>
                  </>
                ) : null}

                {pendingConfirmationCount > 0 ? (
                  <button
                    type="button"
                    className={styles.notificationCta}
                    onClick={() => {
                      setNotificationsOpen(false)
                      onReviewAcceptedTask?.(firstPendingConfirmationTask?.id)
                    }}
                  >
                    Decidir ahora
                  </button>
                ) : null}

                {unreadMessageCount > 0 ? (
                  <button
                    type="button"
                    className={styles.notificationCta}
                    onClick={() => {
                      setNotificationsOpen(false)
                      onOpenChats?.()
                    }}
                  >
                    Ver mensajes
                  </button>
                ) : null}

                {totalNotificationCount === 0 ? (
                  <button
                    type="button"
                    className={styles.notificationCta}
                    onClick={() => {
                      setNotificationsOpen(false)
                      onOpenChats?.()
                    }}
                  >
                    Ver mensajes
                  </button>
                ) : null}
              </div>
            </AnimatedDropdown.Group>
          </AnimatedDropdown>

          <button type="button" className={styles.avatar} onClick={onOpenProfile} aria-label="Abrir perfil">
            {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : userInitial}
          </button>

          <AnimatedDropdown
            isOpen={menuOpen}
            onOpenChange={setMenuOpen}
            align="end"
            width={300}
            portal
            trigger={
              <button type="button" className={styles.menuButton} aria-label="Abrir opciones">
                <span className={styles.menuButtonBars} aria-hidden="true">
                  <span className={styles.menuButtonBar} />
                  <span className={styles.menuButtonBar} />
                  <span className={styles.menuButtonBar} />
                </span>
              </button>
            }
          >
            <AnimatedDropdown.Group title="Principal">
              {primaryItems.map((item) => (
                <AnimatedDropdown.Item
                  key={item.label}
                  onClick={() => handleAction(item.action)}
                >
                  {item.label}
                </AnimatedDropdown.Item>
              ))}
            </AnimatedDropdown.Group>

            <AnimatedDropdown.Divider />

            <AnimatedDropdown.Group title="Cuenta">
              {accountItems.map((item) => (
                <AnimatedDropdown.Item
                  key={item.label}
                  onClick={() => handleAction(item.action)}
                >
                  {item.label}
                </AnimatedDropdown.Item>
              ))}
            </AnimatedDropdown.Group>

            {helperItems.length > 0 ? (
              <>
                <AnimatedDropdown.Divider />
                <AnimatedDropdown.Group title="Ayudante activo">
                  {helperItems.map((item) => (
                    <AnimatedDropdown.Item
                      key={item.label}
                      onClick={() => handleAction(item.action)}
                    >
                      {item.label}
                    </AnimatedDropdown.Item>
                  ))}
                </AnimatedDropdown.Group>
              </>
            ) : null}

            {onLogout ? (
              <>
                <AnimatedDropdown.Divider />
                <AnimatedDropdown.Item danger onClick={handleRequestLogout}>
                  Cerrar sesión
                </AnimatedDropdown.Item>
              </>
            ) : null}
          </AnimatedDropdown>
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
              <button type="button" className="secondary-action" onClick={() => setConfirmLogoutOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="danger-action" onClick={handleConfirmLogout}>
                Salir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
