import SkillBadge from '../../../skills/components/SkillBadge'
import SkillFilter from '../../../skills/components/SkillFilter'
import styles from '../../styles/profilePublicView.module.css'
import ProfileContentSection from '../ProfileContentSection'

export default function ProfileSkillsPanel({ skills = [], activeSkillId, onSkillChange, filteredSkills = [] }) {
  return (
    <ProfileContentSection
      id="habilidades"
      eyebrow="Habilidades"
      title="En qué puede ayudar"
      lead="Las skills se pueden escanear rápido y filtrar por categorías para encontrar compatibilidad real."
    >
      {skills.length > 0 ? (
        <SkillFilter skills={skills} activeSkillId={activeSkillId} onChange={onSkillChange} />
      ) : null}

      <div className={styles.skillGrid}>
        {filteredSkills.length > 0 ? (
          filteredSkills.map((skill) => (
            <SkillBadge
              key={`${skill.skill?.id || skill.id}-${skill.experience_level}`}
              skill={{
                name: skill.skill?.name || skill.name,
                icon: skill.skill?.icon || skill.icon,
              }}
              type="span"
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <strong>Aún no ha añadido habilidades.</strong>
            <p className="muted">El perfil público se irá enriqueciendo cuando el helper complete más datos.</p>
          </div>
        )}
      </div>
    </ProfileContentSection>
  )
}
