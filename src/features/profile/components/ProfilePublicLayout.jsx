import styles from '../styles/profilePublicView.module.css'
import ProfileSidebar from './ProfileSidebar'
import ProfileMain from './ProfileMain'
import ProfileActionBar from './ProfileActionBar'
import ProfileAnchorNav from './ProfileAnchorNav'

// Perfil público single-page: todos los bloques apilados con scroll continuo.
// La lista de secciones es solo un índice de anclas (scroll suave), nunca
// oculta contenido. En escritorio, aside sticky + contenido a la derecha.
export default function ProfilePublicLayout({
  profile,
  reviews,
  skills,
  verifications,
  availability,
  sections,
  isOwnProfile,
  isEditing,
  onToggleEdit,
  onEditIdentity,
  onBack,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.profileNavigation}>
        <button type="button" className={`icon-button ${styles.backButton}`} onClick={onBack} aria-label="Volver">
          ←
        </button>
        <ProfileAnchorNav sections={sections} />
      </div>

      <div className={styles.layout}>
        <ProfileSidebar
          profile={profile}
          isOwnProfile={isOwnProfile}
          isEditing={isEditing}
          onToggleEdit={onToggleEdit}
          onPrimaryAction={onPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          showPrimaryAction={showPrimaryAction}
        />

        <ProfileMain
          profile={profile}
          reviews={reviews}
          skills={skills}
          verifications={verifications}
          availability={availability}
          isOwnProfile={isOwnProfile}
          isEditing={isEditing}
          onEditIdentity={onEditIdentity}
          onPrimaryAction={onPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          showPrimaryAction={showPrimaryAction}
        />
      </div>

      <ProfileActionBar
        isOwnProfile={isOwnProfile}
        onPrimaryAction={onPrimaryAction}
        primaryActionLabel={primaryActionLabel}
        showPrimaryAction={showPrimaryAction}
      />
    </div>
  )
}
