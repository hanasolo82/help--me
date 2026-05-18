import SkillFilter from '../../skills/components/SkillFilter'
import styles from '../../profile/styles/profileNetwork.module.css'

export default function MapFilters({
  skills = [],
  activeSkillId = 'all',
  onSkillChange,
  radiusKm = 10,
  onRadiusChange,
  onlyAvailable = false,
  onOnlyAvailableChange,
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className="eyebrow">Mapa</p>
        <h3 className={styles.sectionTitle}>Filtra helpers cercanos</h3>
      </div>

      <SkillFilter skills={skills} activeSkillId={activeSkillId} onChange={onSkillChange} />

      <label className="field">
        <span>Radio aproximado: {radiusKm} km</span>
        <input type="range" min="1" max="30" value={radiusKm} onChange={(event) => onRadiusChange?.(Number(event.target.value))} />
      </label>

      <label className="field" style={{ gap: '0.35rem' }}>
        <span>Disponibilidad</span>
        <button type="button" className={onlyAvailable ? 'primary-action' : 'secondary-action'} onClick={() => onOnlyAvailableChange?.(!onlyAvailable)}>
          {onlyAvailable ? 'Solo disponibles' : 'Mostrar todos'}
        </button>
      </label>
    </div>
  )
}

