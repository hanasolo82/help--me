import styles from '../../profile/styles/profileNetwork.module.css'

export default function SkillBadge({ skill, active = false, onClick, type = 'button' }) {
  const label = typeof skill === 'string' ? skill : skill?.name || 'Skill'
  const icon = typeof skill === 'string' ? '' : skill?.icon || ''

  const className = `${styles.skillBadge} ${active ? styles.isActive : ''}`.trim()

  if (type === 'span') {
    return (
      <span className={className}>
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
      </span>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      <span>{label}</span>
    </button>
  )
}

