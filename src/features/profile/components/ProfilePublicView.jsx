import ProfilePublicLayout from './ProfilePublicLayout'

export default function ProfilePublicView({
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
  return <ProfilePublicLayout
    profile={profile}
    reviews={reviews}
    skills={skills}
    filteredSkills={filteredSkills}
    verifications={verifications}
    availability={availability}
    sections={sections}
    activeSkillId={activeSkillId}
    onSkillChange={onSkillChange}
    isOwnProfile={isOwnProfile}
    onEditProfile={onEditProfile}
    onBack={onBack}
    onContact={onContact}
    onInviteToTask={onInviteToTask}
    onToggleFavorite={onToggleFavorite}
    favoriteState={favoriteState}
    favoriteLabel={favoriteLabel}
    isFavoriteLoading={isFavoriteLoading}
    helperAvailable={helperAvailable}
  />
}
