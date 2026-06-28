import { TIME_SLOT_OPTIONS } from './taskAvailability'
import styles from './TaskAvailabilityFields.module.css'

export default function TaskAvailabilityFields({
  requestedDate,
  requestedTimeSlot,
  requestedTimeNote,
  onChange,
}) {
  function updateField(field, value) {
    onChange?.({ requestedDate, requestedTimeSlot, requestedTimeNote, [field]: value })
  }

  return (
    <section className={styles.block} aria-label="Cuándo necesitas ayuda">
      <div className={styles.header}>
        <span>¿Cuándo necesitas ayuda?</span>
        <p>Opcional. Si no lo sabes todavía, déjalo flexible.</p>
      </div>

      <div className={styles.grid}>
        <label className="field">
          <span>Día</span>
          <input
            type="date"
            value={requestedDate || ''}
            onChange={(event) => updateField('requestedDate', event.target.value)}
          />
        </label>

        <label className="field">
          <span>Franja</span>
          <select
            value={requestedTimeSlot || 'flexible'}
            onChange={(event) => updateField('requestedTimeSlot', event.target.value)}
          >
            {TIME_SLOT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Nota opcional</span>
        <textarea
          value={requestedTimeNote || ''}
          onChange={(event) => updateField('requestedTimeNote', event.target.value)}
          placeholder="Ej. Mejor después de las 18:00"
          maxLength={240}
          rows={2}
        />
      </label>
    </section>
  )
}
