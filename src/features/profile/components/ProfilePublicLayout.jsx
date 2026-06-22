import styles from '../styles/profilePublicView.module.css'
import ProfileSidebar from './ProfileSidebar'
import ProfileMain from './ProfileMain'
import ProfileActionBar from './ProfileActionBar'
import ProfileSectionTabs from './ProfileSectionTabs'

export default function ProfilePublicLayout({
  profile,
  reviews,
  skills,
  filteredSkills,
  verifications,
  availability,
  sections,
  activeSkillId,
  onSkillChange,
  isOwnProfile,
  onEditProfile,
  onBack,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onToggleFavorite,
  favoriteState,
  favoriteLabel,
  isFavoriteLoading,
  helperAvailable,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.profileNavigation}>
        <button type="button" className={`secondary-action ${styles.backButton}`} onClick={onBack}>
          Volver
        </button>
        <ProfileSectionTabs sections={sections} />
      </div>

      <div className={styles.layout}>
        <ProfileSidebar
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditProfile={onEditProfile}
          onPrimaryAction={onPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          showPrimaryAction={showPrimaryAction}
          onToggleFavorite={onToggleFavorite}
          favoriteLabel={favoriteLabel}
          isFavoriteLoading={isFavoriteLoading}
          favoriteState={favoriteState}
          helperAvailable={helperAvailable}
        />

        <ProfileMain
          profile={profile}
          reviews={reviews}
          skills={skills}
          filteredSkills={filteredSkills}
          verifications={verifications}
          availability={availability}
          activeSkillId={activeSkillId}
          onSkillChange={onSkillChange}
        />
      </div>

      <ProfileActionBar
        isOwnProfile={isOwnProfile}
        onPrimaryAction={onPrimaryAction}
        primaryActionLabel={primaryActionLabel}
        showPrimaryAction={showPrimaryAction}
        onToggleFavorite={onToggleFavorite}
        favoriteLabel={favoriteLabel}
        favoriteState={favoriteState}
        isFavoriteLoading={isFavoriteLoading}
      />
    </div>
  )
}
