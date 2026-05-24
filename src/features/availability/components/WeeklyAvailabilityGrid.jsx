import styles from '../../profile/styles/profileNetwork.module.css'
import { deriveAvailabilityUpdatedAt } from '../../profile/utils/profileFormatters'

const DAYS = [
  { short: 'Lu', day: 1, label: 'Lunes' },
  { short: 'Ma', day: 2, label: 'Martes' },
  { short: 'Mi', day: 3, label: 'Miércoles' },
  { short: 'Ju', day: 4, label: 'Jueves' },
  { short: 'Vi', day: 5, label: 'Viernes' },
  { short: 'Sá', day: 6, label: 'Sábado' },
  { short: 'Do', day: 0, label: 'Domingo' },
]

function hasDayAvailability(slots, day) {
  return slots.some((slot) => Number(slot.day_of_week) === day.day)
}

export default function WeeklyAvailabilityGrid({ slots = [], availabilityEnabled = true }) {
  const hasSlots = slots.length > 0
  const updatedAtLabel = deriveAvailabilityUpdatedAt(slots)

  if (!availabilityEnabled) {
    return (
      <div className={styles.availabilityShell}>
        <div className={styles.availabilityCompactCard}>
          <div className={styles.availabilityCompactHeader}>
            <strong>Disponibilidad pausada</strong>
            <p className="muted">El helper ha pausado temporalmente su disponibilidad pública.</p>
          </div>

          {hasSlots ? (
            <div className={styles.availabilityCompactMatrixWrap}>
              <div className={styles.availabilityCompactMatrix} role="grid" aria-label="Disponibilidad semanal pausada">
                {DAYS.map((day) => {
                  const available = hasDayAvailability(slots, day)

                  return (
                    <div
                      key={day.day}
                      className={styles.availabilityCompactCell}
                      aria-label={`${day.label} ${available ? 'disponible' : 'no disponible'}`}
                      title={`${day.label} ${available ? 'disponible' : 'no disponible'}`}
                    >
                      <span className={styles.availabilityCompactDay}>{day.short}</span>
                      <span
                        className={available ? styles.availabilityCompactCheck : styles.availabilityCompactDot}
                        aria-hidden="true"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {updatedAtLabel ? <p className={styles.availabilityUpdated}>Actualizado: {updatedAtLabel}</p> : null}
        </div>
      </div>
    )
  }

  if (!hasSlots) {
    return (
      <div className={styles.availabilityShell}>
        <div className={styles.availabilityCompactCard}>
          <strong>Disponibilidad no publicada</strong>
          <p className="muted">Todavía no se ha compartido una matriz semanal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.availabilityShell}>
      <div className={styles.availabilityCompactCard}>
        <div className={styles.availabilityCompactHeader}>
          <strong>Disponibilidad</strong>
          <p className="muted">Lectura rápida por semana.</p>
        </div>

        <div className={styles.availabilityCompactMatrixWrap}>
          <div className={styles.availabilityCompactMatrix} role="grid" aria-label="Disponibilidad semanal">
            {DAYS.map((day) => {
              const available = hasDayAvailability(slots, day)

              return (
                <div
                  key={day.day}
                  className={styles.availabilityCompactCell}
                  aria-label={`${day.label} ${available ? 'disponible' : 'no disponible'}`}
                  title={`${day.label} ${available ? 'disponible' : 'no disponible'}`}
                >
                  <span className={styles.availabilityCompactDay} aria-hidden="true">
                    {day.short}
                  </span>
                  <span
                    className={available ? styles.availabilityCompactCheck : styles.availabilityCompactDot}
                    aria-hidden="true"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {updatedAtLabel ? <p className={styles.availabilityUpdated}>Actualizado: {updatedAtLabel}</p> : null}
      </div>
    </div>
  )
}
