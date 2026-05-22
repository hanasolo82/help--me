import styles from './WeeklyAvailabilityDots.module.css'

const DAYS = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 0, short: 'D', label: 'Domingo' },
]

function normalizeDays(selectedDays = []) {
  const uniqueDays = []

  for (const value of selectedDays) {
    const day = Number(value)
    if (!Number.isInteger(day) || day < 0 || day > 6) continue
    if (!uniqueDays.includes(day)) uniqueDays.push(day)
  }

  return uniqueDays
}

export default function WeeklyAvailabilityDots({
  selectedDays = [],
  size = 'sm',
  interactive = false,
  onToggle,
}) {
  const normalizedDays = normalizeDays(selectedDays)
  const selectedSet = new Set(normalizedDays)
  const rootClassName = `${styles.dots} ${styles[size] || styles.sm}`.trim()

  return (
    <div className={rootClassName} role="group" aria-label="Disponibilidad semanal">
      {DAYS.map((day) => {
        const isSelected = selectedSet.has(day.value)
        const content = (
          <>
            <span className={`${styles.dot} ${isSelected ? styles.dotOn : styles.dotOff}`.trim()} aria-hidden="true" />
            <span className={styles.label}>{day.short}</span>
          </>
        )

        if (!interactive) {
          return (
            <span key={day.value} className={`${styles.day} ${isSelected ? styles.dayOn : ''}`.trim()}>
              {content}
            </span>
          )
        }

        return (
          <button
            key={day.value}
            type="button"
            className={`${styles.day} ${isSelected ? styles.dayOn : ''}`.trim()}
            aria-pressed={isSelected}
            aria-label={`${day.label}, ${isSelected ? 'disponible' : 'no disponible'}`}
            onClick={() => onToggle?.(day.value)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
