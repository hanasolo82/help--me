import styles from '../styles/profilePublicView.module.css'

export default function ProfileActionBar({
  isOwnProfile,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onToggleFavorite,
  favoriteLabel,
  favoriteState,
  isFavoriteLoading,
}) {
  if (isOwnProfile) {
    return null
  }

  return (
    <div
      className={`${styles.actionBar} ${showPrimaryAction ? '' : styles.actionBarSingle}`.trim()}
      role="toolbar"
      aria-label="Acciones rápidas del perfil"
    >
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
    </div>
  )
}
