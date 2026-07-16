import ProfilePublicLayout from './ProfilePublicLayout'

export default function ProfilePublicView({
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
  return <ProfilePublicLayout
    profile={profile}
    reviews={reviews}
    skills={skills}
    verifications={verifications}
    availability={availability}
    sections={sections}
    isOwnProfile={isOwnProfile}
    isEditing={isEditing}
    onToggleEdit={onToggleEdit}
    onEditIdentity={onEditIdentity}
    onBack={onBack}
    onPrimaryAction={onPrimaryAction}
    primaryActionLabel={primaryActionLabel}
    showPrimaryAction={showPrimaryAction}
  />
}
