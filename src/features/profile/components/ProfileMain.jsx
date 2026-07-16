import styles from '../styles/profilePublicView.module.css'
import ProfileOverviewPanel from './panels/ProfileOverviewPanel'
import ProfileSkillsPanel from './panels/ProfileSkillsPanel'
import ProfileTrustPanel from './panels/ProfileTrustPanel'
import ProfileReviewsPanel from './panels/ProfileReviewsPanel'
import ProfileAvailabilityPanel from './panels/ProfileAvailabilityPanel'
import ProfileContactPanel from './panels/ProfileContactPanel'

// Single-page: todos los bloques apilados, en este orden — Sobre mí,
// Disponibilidad (arriba, tras la cabecera), Habilidades, Confianza,
// Opiniones y CTA de contacto (solo visitantes). Los ids son las anclas
// del índice de navegación.
export default function ProfileMain({
  profile,
  reviews = [],
  skills = [],
  verifications,
  availability = [],
  isOwnProfile = false,
  isEditing = false,
  onEditIdentity,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onSecondaryAction,
  secondaryActionLabel,
  showSecondaryAction,
}) {
  const canEdit = isOwnProfile && isEditing

  return (
    <main className={styles.main}>
      <ProfileOverviewPanel
        profile={profile}
        reviews={reviews}
        isEditing={canEdit}
        onEditIdentity={onEditIdentity}
      />
      <ProfileAvailabilityPanel
        profile={profile}
        availability={availability}
        isEditing={canEdit}
      />
      <ProfileSkillsPanel
        profile={profile}
        skills={skills}
        isEditing={canEdit}
      />
      <ProfileTrustPanel profile={profile} verifications={verifications} />
      <ProfileReviewsPanel profile={profile} reviews={reviews} />
      {!isOwnProfile ? (
        <ProfileContactPanel
          profile={profile}
          onPrimaryAction={onPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          showPrimaryAction={showPrimaryAction}
          onSecondaryAction={onSecondaryAction}
          secondaryActionLabel={secondaryActionLabel}
          showSecondaryAction={showSecondaryAction}
        />
      ) : null}
    </main>
  )
}
