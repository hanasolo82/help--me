import styles from '../styles/profilePublicView.module.css'
import ProfileOverviewPanel from './panels/ProfileOverviewPanel'
import ProfileSkillsPanel from './panels/ProfileSkillsPanel'
import ProfileTrustPanel from './panels/ProfileTrustPanel'
import ProfileReviewsPanel from './panels/ProfileReviewsPanel'
import ProfileAvailabilityPanel from './panels/ProfileAvailabilityPanel'

export default function ProfileMain({
  profile,
  reviews = [],
  skills = [],
  filteredSkills = [],
  verifications,
  availability = [],
  activeSkillId,
  onSkillChange,
}) {
  return (
    <main className={styles.main}>
      <ProfileOverviewPanel profile={profile} reviews={reviews} />
      <ProfileSkillsPanel
        skills={skills}
        activeSkillId={activeSkillId}
        onSkillChange={onSkillChange}
        filteredSkills={filteredSkills}
      />
      <ProfileTrustPanel profile={profile} verifications={verifications} />
      <ProfileReviewsPanel profile={profile} reviews={reviews} />
      <ProfileAvailabilityPanel profile={profile} availability={availability} />
    </main>
  )
}
