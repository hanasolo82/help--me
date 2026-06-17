import UserAvatar from '../../../shared/ui/UserAvatar'
import styles from '../styles/profilePublicView.module.css'
import ProfileSectionTabs from './ProfileSectionTabs'
import {
  getHelperStatusCopy,
  getHelperStatusLabel,
  getLocationLabel,
  getProfileName,
  getProfileHandle,
} from '../utils/profileFormatters'

export default function ProfileSidebar({
  profile,
  isOwnProfile,
  onEditProfile,
  onBack,
  onContact,
  onInviteToTask,
  onToggleFavorite,
  favoriteLabel,
  isFavoriteLoading,
  favoriteState,
  sections = [],
  helperAvailable = false,
}) {
  const displayName = getProfileName(profile)
  const handle = getProfileHandle(profile)
  const locationLabel = getLocationLabel(profile)
  const helperStatusLabel = getHelperStatusLabel(profile)
  const helperStatusCopy = getHelperStatusCopy(profile)

  return (
    <aside className={`${styles.sidebar} ${isOwnProfile ? styles.sidebarOwn : styles.sidebarGuest}`.trim()}>
      <div className={styles.sidebarHero}>
        <UserAvatar
          src={profile?.avatar_url}
          name={displayName}
          alt={displayName}
          size="xl"
          variant="rounded"
          className={styles.sidebarAvatar}
        />

        <div className={styles.sidebarIdentity}>
          <p className={styles.sidebarEyebrow}>{isOwnProfile ? 'Tu perfil público' : 'Perfil de ayudante'}</p>
          <h1 className={styles.sidebarName}>{displayName}</h1>
          <p className={styles.sidebarHandle}>{handle}</p>
          <p className={styles.sidebarLocation}>{locationLabel}</p>
        </div>
      </div>

      <div className={styles.sidebarStatus}>
        <strong>{helperStatusLabel}</strong>
        <p>{helperStatusCopy}</p>
      </div>

      <div className={styles.sidebarStats}>
        <div className={styles.sidebarStat}>
          <span>Valoración</span>
          <strong>{Number(profile?.rating ?? 0).toFixed(1)}</strong>
        </div>
        <div className={styles.sidebarStat}>
          <span>Estado</span>
          <strong>{helperAvailable ? 'Activo' : 'Pausado'}</strong>
        </div>
      </div>

      <ProfileSectionTabs sections={sections} />

      <div className={styles.sidebarActions}>
        {isOwnProfile ? (
          <>
            <button type="button" className="primary-action" onClick={onEditProfile}>
              Editar perfil
            </button>
            <button type="button" className="secondary-action" onClick={onBack}>
              Atrás
            </button>
          </>
        ) : (
          <>
            <button type="button" className="primary-action" onClick={onContact}>
              Pedir ayuda
            </button>
            <button type="button" className="secondary-action" onClick={onInviteToTask}>
              Invitar a tarea
            </button>
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
