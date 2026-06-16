import styles from '../styles/profilePublicView.module.css'

export default function ProfileActionBar({
  isOwnProfile,
  onContact,
  onInviteToTask,
  onToggleFavorite,
  favoriteLabel,
  favoriteState,
  isFavoriteLoading,
}) {
  if (isOwnProfile) {
    return null
  }

  return (
    <div className={styles.actionBar} role="toolbar" aria-label="Acciones rápidas del perfil">
      <button type="button" className="primary-action" onClick={onContact}>
        Pedir ayuda
      </button>
      <button type="button" className="secondary-action" onClick={onInviteToTask}>
        Invitar
      </button>
      <button
        type="button"
        className="secondary-action"
        onClick={onToggleFavorite}
        disabled={isFavoriteLoading}
      >
        {favoriteState?.isFavorite ? 'Quitar favorito' : favoriteLabel}
      </button>
    </div>
  )
}
