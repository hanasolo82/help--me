import {
  AVAILABILITY_RESPONSE_OPTIONS,
  TIME_SLOT_OPTIONS,
  formatTaskAvailabilityFull,
} from './taskAvailability'
import styles from './TaskAvailabilityFields.module.css'

export default function ApplicationAvailabilityFields({
  task,
  availabilityResponse,
  proposedDate,
  proposedTimeSlot,
  proposedTimeNote,
  message,
  onChange,
}) {
  const response = availabilityResponse || 'matches'
  const isAlternative = response === 'alternative'

  function updateField(field, value) {
    onChange?.({
      availabilityResponse: response,
      proposedDate,
      proposedTimeSlot,
      proposedTimeNote,
      message,
      [field]: value,
    })
  }

  return (
    <section className={styles.block} aria-label="Disponibilidad para ofrecerte">
      <div className={styles.header}>
        <span>¿Te encaja este horario?</span>
        <p>{formatTaskAvailabilityFull(task)}</p>
      </div>

      <div className={styles.segmented} role="group" aria-label="Respuesta de disponibilidad">
        {AVAILABILITY_RESPONSE_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={response === option.value ? styles.segmentSelected : styles.segment}
            onClick={() => updateField('availabilityResponse', option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {isAlternative ? (
        <div className={styles.grid}>
          <label className="field">
            <span>Día propuesto</span>
            <input
              type="date"
              value={proposedDate || ''}
              onChange={(event) => updateField('proposedDate', event.target.value)}
            />
          </label>

          <label className="field">
            <span>Franja propuesta</span>
            <select
              value={proposedTimeSlot || 'flexible'}
              onChange={(event) => updateField('proposedTimeSlot', event.target.value)}
            >
              {TIME_SLOT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <label className="field">
        <span>{isAlternative ? 'Nota para el requester' : 'Mensaje opcional'}</span>
        <textarea
          value={isAlternative ? proposedTimeNote || '' : message || ''}
          onChange={(event) => updateField(isAlternative ? 'proposedTimeNote' : 'message', event.target.value)}
          placeholder={isAlternative ? 'Ej. Puedo el martes por la tarde.' : 'Ej. Tengo experiencia con tareas similares.'}
          maxLength={isAlternative ? 240 : 600}
          rows={2}
        />
      </label>
    </section>
  )
}
