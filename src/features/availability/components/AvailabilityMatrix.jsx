import { Check } from 'lucide-react'
import { TIME_SLOTS, WEEK_DAYS, cellKey } from '../timeSlots'
import styles from './AvailabilityMatrix.module.css'

// Matriz semanal franjas × días (estilo Babysits). Una sola pieza para los dos
// modos: lectura (celdas estáticas) y edición (celdas botón con aria-pressed).
// Accesibilidad: es una <table> real —cabeceras de fila/columna asociadas— y
// cada celda lleva texto para lector de pantalla, no solo color.
export default function AvailabilityMatrix({
  cells,
  editable = false,
  onToggleCell,
  updatedAtLabel = '',
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.scroller}>
        <table className={styles.matrix}>
          <caption className={styles.srOnly}>
            Disponibilidad semanal por franjas horarias
          </caption>
          <thead>
            <tr>
              <th scope="col" className={styles.slotHeading}>
                <span className={styles.srOnly}>Franja horaria</span>
              </th>
              {WEEK_DAYS.map((day) => (
                <th key={day.day} scope="col" className={styles.dayHeading} title={day.label}>
                  <abbr aria-label={day.label} title={day.label}>{day.short}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot) => (
              <tr key={slot.id}>
                <th scope="row" className={styles.slotLabel}>
                  {slot.label}
                </th>
                {WEEK_DAYS.map((day) => {
                  const available = cells.has(cellKey(day.day, slot.id))
                  const cellCopy = `${day.label}, ${slot.label.toLowerCase()}: ${available ? 'disponible' : 'no disponible'}`

                  return (
                    <td key={day.day} className={styles.cell}>
                      {editable ? (
                        <button
                          type="button"
                          className={available ? `${styles.indicator} ${styles.indicatorOn} ${styles.indicatorButton}` : `${styles.indicator} ${styles.indicatorButton}`}
                          aria-pressed={available}
                          aria-label={cellCopy}
                          title={cellCopy}
                          onClick={() => onToggleCell?.(day.day, slot.id)}
                        >
                          {available ? <Check aria-hidden="true" strokeWidth={3} /> : <span className={styles.dot} aria-hidden="true" />}
                        </button>
                      ) : (
                        <span
                          className={available ? `${styles.indicator} ${styles.indicatorOn}` : styles.indicator}
                          title={cellCopy}
                        >
                          {available ? <Check aria-hidden="true" strokeWidth={3} /> : <span className={styles.dot} aria-hidden="true" />}
                          <span className={styles.srOnly}>{cellCopy}</span>
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {updatedAtLabel ? <p className={styles.updated}>Actualizado: {updatedAtLabel}</p> : null}
    </div>
  )
}
