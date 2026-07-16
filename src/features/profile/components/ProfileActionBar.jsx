import styles from '../styles/profilePublicView.module.css'

export default function ProfileActionBar({
  isOwnProfile,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onSecondaryAction,
  secondaryActionLabel,
  showSecondaryAction,
}) {
  if (isOwnProfile || (!showPrimaryAction && !showSecondaryAction)) {
    return null
  }

  return (
    <div
      className={`${styles.actionBar} ${showPrimaryAction && showSecondaryAction ? '' : styles.actionBarSingle}`.trim()}
      role="toolbar"
      aria-label="Acciones rápidas del perfil"
    >
      {showPrimaryAction ? (
        <button type="button" className="primary-action" onClick={onPrimaryAction}>
          {primaryActionLabel}
        </button>
      ) : null}
      {showSecondaryAction ? (
        <button type="button" className="secondary-action" onClick={onSecondaryAction}>
          {secondaryActionLabel}
        </button>
      ) : null}
    </div>
  )
}
