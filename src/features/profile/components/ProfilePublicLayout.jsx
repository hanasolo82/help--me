import styles from '../styles/profilePublicView.module.css'
import ProfileSidebar from './ProfileSidebar'
import ProfileMain from './ProfileMain'
import ProfileActionBar from './ProfileActionBar'

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
  onContact,
  onInviteToTask,
  onToggleFavorite,
  favoriteState,
  favoriteLabel,
  isFavoriteLoading,
  helperAvailable,
}) {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <ProfileSidebar
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditProfile={onEditProfile}
          onBack={onBack}
          onContact={onContact}
          onInviteToTask={onInviteToTask}
          onToggleFavorite={onToggleFavorite}
          favoriteLabel={favoriteLabel}
          isFavoriteLoading={isFavoriteLoading}
          favoriteState={favoriteState}
          sections={sections}
          helperAvailable={helperAvailable}
        />

        <ProfileMain
          sections={sections}
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
        onContact={onContact}
        onInviteToTask={onInviteToTask}
        onToggleFavorite={onToggleFavorite}
        favoriteLabel={favoriteLabel}
        favoriteState={favoriteState}
        isFavoriteLoading={isFavoriteLoading}
      />
    </div>
  )
}
