import styles from '../styles/helperHome.module.css'
import { getProfileName, getHelperStatusLabel } from '../../profile/utils/profileFormatters'

export default function HelperStatusHero({
  profile,
  openTaskCount = 0,
  radiusKm = 10,
  compatibilityScore = 0,
  onToggleAvailability,
}) {
  const isPaused = profile?.availability_enabled === false
  const helperStatusLabel = getHelperStatusLabel(profile)
  const profileName = getProfileName(profile)

  return (
    <section className={styles.compactHero} aria-label="Estado del helper">
      <div className={styles.compactHeroStrip}>
        <div className={styles.compactHeroCopy}>
          <p className="eyebrow">Helper workspace</p>
          <h2>{profileName}</h2>
          <p>{helperStatusLabel}</p>
        </div>

        <div className={styles.compactHeroMetrics} aria-label="Resumen operativo">
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>Solicitudes nuevas</span>
            <strong>{openTaskCount}</strong>
          </div>
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>Radio</span>
            <strong>{Number.isFinite(Number(radiusKm)) ? Number(radiusKm) : 10} km</strong>
          </div>
          <div className={styles.compactStat}>
            <span className={styles.compactStatLabel}>Compatibilidad</span>
            <strong>{Number.isFinite(Number(compatibilityScore)) ? `${Math.round(compatibilityScore)}%` : '0%'}</strong>
          </div>
        </div>

        <div className={styles.compactHeroAction}>
          <button
            type="button"
            className={styles.availabilityToggle}
            onClick={onToggleAvailability}
            aria-label="Ajustar disponibilidad"
          >
            <span className={`${styles.toggleDot} ${isPaused ? styles.toggleDotPaused : styles.toggleDotActive}`} aria-hidden="true" />
            <span>{isPaused ? 'Pausado' : 'Disponible'}</span>
          </button>
          <span className={styles.heroHint}>{isPaused ? 'Actívalo para recibir oportunidades.' : 'Listo para nuevas solicitudes.'}</span>
        </div>
      </div>
    </section>
  )
}
