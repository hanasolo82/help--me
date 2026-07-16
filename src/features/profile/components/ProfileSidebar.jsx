import UserAvatar from '../../../shared/ui/UserAvatar'
import styles from '../styles/profilePublicView.module.css'
import {
  getLocationLabel,
  getProfileName,
  getProfileHandle,
} from '../utils/profileFormatters'

// Aside de identidad: avatar, nombre, handle, ubicación, valoración y acciones.
// Sin bloque de "Helper activo" ni stat de Estado: un ayudante inactivo no
// aparece en el listado/mapa, así que ese dato no aporta nada al visitante.
// La valoración y la ubicación viven SOLO aquí (no se repiten en el panel).
export default function ProfileSidebar({
  profile,
  isOwnProfile,
  isEditing = false,
  onToggleEdit,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onToggleFavorite,
  favoriteLabel,
  isFavoriteLoading,
  favoriteState,
}) {
  const displayName = getProfileName(profile)
  const handle = getProfileHandle(profile)
  const locationLabel = getLocationLabel(profile)

  return (
    <aside className={`${styles.sidebar} ${isOwnProfile ? styles.sidebarOwn : styles.sidebarGuest}`.trim()}>
      <div className={styles.sidebarHero}>
        <UserAvatar
          src={profile?.avatar_url}
          name={displayName}
          alt={displayName}
          size="xl"
          variant="circle"
          className={styles.sidebarAvatar}
        />

        <div className={styles.sidebarIdentity}>
          <p className={styles.sidebarEyebrow}>{isOwnProfile ? 'Tu perfil público' : 'Perfil de ayudante'}</p>
          <h1 className={styles.sidebarName}>{displayName}</h1>
          <p className={styles.sidebarHandle}>{handle}</p>
          <p className={styles.sidebarLocation}>{locationLabel}</p>
        </div>
      </div>

      <div className={styles.sidebarStats}>
        <div className={styles.sidebarStat}>
          <span>Valoración</span>
          <strong>{Number(profile?.rating ?? 0).toFixed(1)}</strong>
        </div>
      </div>

      <div className={styles.sidebarActions}>
        {isOwnProfile ? (
          <button
            type="button"
            className={isEditing ? 'secondary-action' : 'primary-action'}
            onClick={onToggleEdit}
            aria-pressed={isEditing}
          >
            {isEditing ? 'Salir de edición' : 'Editar perfil'}
          </button>
        ) : (
          <>
            {showPrimaryAction ? (
              <button type="button" className="primary-action" onClick={onPrimaryAction}>
                {primaryActionLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="secondary-action"
              onClick={onToggleFavorite}
              disabled={isFavoriteLoading}
            >
              {favoriteState?.isFavorite ? 'Quitar favorito' : favoriteLabel}
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
