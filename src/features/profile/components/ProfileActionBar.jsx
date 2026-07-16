import styles from '../styles/profilePublicView.module.css'

export default function ProfileActionBar({
  isOwnProfile,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
}) {
  if (isOwnProfile || !showPrimaryAction) {
    return null
  }

  return (
    <div
      className={`${styles.actionBar} ${styles.actionBarSingle}`}
      role="toolbar"
      aria-label="Acciones rápidas del perfil"
    >
      <button type="button" className="primary-action" onClick={onPrimaryAction}>
        {primaryActionLabel}
      </button>
    </div>
  )
}
