import styles from '../SettingsPage.module.css'
import SettingsCard from './SettingsCard'

const durationOptions = ['Solo ahora', 'Hoy', 'Esta semana', 'Hasta desactivarlo']

export default function ActivityZoneSettings() {
  return (
    <SettingsCard
      id="actividad-zona"
      eyebrow="Actividad"
      title="Actividad y zona"
      description="Prepara una zona temporal para mirar actividad o recibir oportunidades sin cambiar tu configuración base."
    >
      <div className={styles.featureHero}>
        <div>
          <span className={styles.lockedBadge}>Preparado</span>
          <h3>Zona activa</h3>
          <p>La zona temporal se activará cuando esté lista. Por ahora no solicita ubicación ni modifica coordenadas.</p>
        </div>
        <button type="button" className={styles.disabledPill} disabled>
          Cambiar zona temporalmente
        </button>
      </div>

      <div className={styles.zonePreview}>
        <div>
          <span className={styles.panelKicker}>Zona activa</span>
          <strong>Sin zona temporal activa</strong>
          <p>HelpMe seguirá usando tu configuración actual hasta que puedas definir una zona temporal.</p>
        </div>
        <div className={styles.durationGrid} aria-label="Duración de zona temporal">
          {durationOptions.map((option) => (
            <button key={option} type="button" disabled>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.settingsStack}>
        <div className={styles.premiumRow}>
          <div>
            <strong>Sincronizar con mi ubicación actual</strong>
            <p>HelpMe actualizará tu zona activa cuando cambies de ubicación.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Pendiente
          </button>
        </div>

        <div className={styles.premiumRow}>
          <div>
            <strong>Recibir solicitudes en esta zona</strong>
            <p>Usa esta zona temporal para recibir oportunidades mientras estés allí.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Pendiente
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
