import SkillBadge from './SkillBadge'
import styles from '../../profile/styles/profileNetwork.module.css'

export default function SkillFilter({ skills = [], activeSkillId = 'all', onChange }) {
  return (
    <div className={styles.skillGrid} role="tablist" aria-label="Filtro de skills">
      <SkillBadge
        skill={{ name: 'Todas', icon: '✨' }}
        active={activeSkillId === 'all'}
        onClick={() => onChange?.('all')}
      />
      {skills.map((skill) => (
        <SkillBadge
          key={skill.id}
          skill={skill}
          active={activeSkillId === skill.id}
          onClick={() => onChange?.(skill.id)}
        />
      ))}
    </div>
  )
}

