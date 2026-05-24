import SkillFilter from '../../../skills/components/SkillFilter'
import styles from './NeedHelpMapLayout.module.css'

const radiusOptions = [1, 3, 5, 10, 20]

export default function HelperFiltersBar({
  skillFilters = [],
  selectedSkillId = 'all',
  onSkillChange,
  radiusKm = 10,
  onRadiusChange,
  onlyAvailable = false,
  onOnlyAvailableChange,
}) {
  return (
    <div className={styles.filtersBar}>
      <div className={styles.filtersHeader}>
        <div>
          <p className="eyebrow">Filtros</p>
          <h2>Encuentra la ayuda adecuada</h2>
        </div>
      </div>

      <div className={styles.filtersBlock}>
        <SkillFilter skills={skillFilters} activeSkillId={selectedSkillId} onChange={onSkillChange} />
      </div>

      <label className={styles.filterField}>
        <span>Radio de búsqueda</span>
        <select value={radiusKm} onChange={(event) => onRadiusChange?.(Number(event.target.value))}>
          {radiusOptions.map((option) => (
            <option key={option} value={option}>
              {option} km
            </option>
          ))}
        </select>
      </label>

      <div className={styles.filterToggleRow}>
        <span>Disponibilidad</span>
        <button
          type="button"
          className={onlyAvailable ? styles.availabilityToggleActive : styles.availabilityToggle}
          aria-pressed={onlyAvailable}
          onClick={() => onOnlyAvailableChange?.(!onlyAvailable)}
        >
          {onlyAvailable ? 'Solo disponibles' : 'Mostrar todos'}
        </button>
      </div>
    </div>
  )
}
