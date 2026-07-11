import { TASK_MINIMUM_LEAD_MINUTES } from './taskAvailability'
import styles from './TaskAvailabilityFields.module.css'

export default function TaskAvailabilityFields({
  startsAt,
  endsAt,
  timezone,
  requestedTimeNote,
  onChange,
  error = '',
}) {
  function updateField(field, value) {
    onChange?.({ startsAt, endsAt, timezone, requestedTimeNote, [field]: value })
  }

  return (
    <section className={styles.block} aria-label="Cuándo se realizará la tarea">
      <div className={styles.header}>
        <span>¿Cuándo se realizará?</span>
        <p>Marca una hora de inicio y otra de finalización. El inicio debe estar al menos a {TASK_MINIMUM_LEAD_MINUTES} minutos.</p>
      </div>

      <div className={styles.grid}>
        <label className="field">
          <span>Inicio</span>
          <input
            id="request-starts-at-input"
            type="datetime-local"
            value={startsAt || ''}
            onChange={(event) => updateField('startsAt', event.target.value)}
            aria-invalid={error ? 'true' : undefined}
          />
        </label>

        <label className="field">
          <span>Finalización</span>
          <input
            id="request-ends-at-input"
            type="datetime-local"
            value={endsAt || ''}
            onChange={(event) => updateField('endsAt', event.target.value)}
            aria-invalid={error ? 'true' : undefined}
          />
        </label>
      </div>

      {error ? <p className={styles.error} role="alert">{error}</p> : null}

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
