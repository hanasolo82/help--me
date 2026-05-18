import SkillBadge from './SkillBadge'
import styles from '../../profile/styles/profileNetwork.module.css'

export default function SkillSelector({ skills = [], selectedSkillIds = [], onToggleSkill, onClear }) {
  return (
    <div className={styles.skillGrid}>
      {skills.map((skill) => (
        <SkillBadge
          key={skill.id}
          skill={skill}
          active={selectedSkillIds.includes(skill.id)}
          onClick={() => onToggleSkill?.(skill.id)}
        />
      ))}
      {selectedSkillIds.length > 0 ? (
        <button type="button" className="link-button" onClick={onClear}>
          Limpiar selección
        </button>
      ) : null}
    </div>
  )
}

