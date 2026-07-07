import styles from '../styles/profilePublicView.module.css'
import ProfileOverviewPanel from './panels/ProfileOverviewPanel'
import ProfileSkillsPanel from './panels/ProfileSkillsPanel'
import ProfileTrustPanel from './panels/ProfileTrustPanel'
import ProfileReviewsPanel from './panels/ProfileReviewsPanel'
import ProfileAvailabilityPanel from './panels/ProfileAvailabilityPanel'

// Navegación real por secciones: solo se monta el panel activo (los ids deben
// coincidir con `sections` en ProfilePage). Sin id, se muestran todos.
export default function ProfileMain({
  profile,
  reviews = [],
  skills = [],
  filteredSkills = [],
  verifications,
  availability = [],
  activeSkillId,
  onSkillChange,
  activeSectionId = null,
}) {
  const panels = [
    {
      id: 'resumen',
      element: <ProfileOverviewPanel key="resumen" profile={profile} reviews={reviews} />,
    },
    {
      id: 'habilidades',
      element: (
        <ProfileSkillsPanel
          key="habilidades"
          skills={skills}
          activeSkillId={activeSkillId}
          onSkillChange={onSkillChange}
          filteredSkills={filteredSkills}
        />
      ),
    },
    {
      id: 'confianza',
      element: <ProfileTrustPanel key="confianza" profile={profile} verifications={verifications} />,
    },
    {
      id: 'opiniones',
      element: <ProfileReviewsPanel key="opiniones" profile={profile} reviews={reviews} />,
    },
    {
      id: 'disponibilidad',
      element: <ProfileAvailabilityPanel key="disponibilidad" profile={profile} availability={availability} />,
    },
  ]

  const visiblePanels = activeSectionId
    ? panels.filter((panel) => panel.id === activeSectionId)
    : panels

  return <main className={styles.main}>{visiblePanels.map((panel) => panel.element)}</main>
}
