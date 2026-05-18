import styles from '../../pages/Home/Home.module.css'

export default function HomeHeader({
  locationLabel,
  displayName,
  avatarUrl,
  userInitial,
  onOpenChats,
  onOpenSettings,
  onOpenProfile,
  onLogout,
}) {
  return (
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
        <button type="button" className={styles.mapButton} onClick={onOpenChats}>
          Chats
        </button>
        <button type="button" className={styles.mapButton} onClick={onOpenSettings}>
          Ajustes
        </button>
        {onLogout && (
          <button type="button" className={styles.landingButton} onClick={onLogout}>
            Salir
          </button>
        )}
        <button
          type="button"
          className={styles.avatar}
          onClick={onOpenProfile}
          aria-label="Abrir perfil"
        >
          {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : userInitial}
        </button>
      </div>
    </header>
  )
}

