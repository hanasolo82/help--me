import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import PublicProfilePreview from './PublicProfilePreview'

function getHelperState(profile) {
  if (profile?.helper_status === 'active') return 'active'
  if (profile?.helper_enabled || profile?.helper_status) return 'pending'

  return 'locked'
}

function getHelperStateCopy(state) {
  if (state === 'active') {
    return {
      label: 'Activo',
      title: 'Tu capa de ayudante está activa',
      text: 'Tu perfil profesional está listo. Los controles avanzados se incorporarán aquí de forma progresiva.',
      cta: '',
    }
  }

  if (state === 'pending') {
    return {
      label: 'Pendiente',
      title: 'Completa tu configuración como ayudante',
      text: 'Tu perfil ya tiene pasos iniciados. Continúa el proceso para desbloquear la experiencia completa.',
      cta: 'Completar configuración',
    }
  }

  return {
    label: 'Bloqueado',
    title: 'Activa tu perfil de ayudante',
    text: 'El modo ayudante añade una capa profesional para recibir oportunidades, mostrar habilidades y preparar cobros.',
    cta: 'Activar modo ayudante',
  }
}

export default function HelperModeSettings() {
  const { profile, onStartHelperSetup } = useSettings()
  const helperState = getHelperState(profile)
  const copy = getHelperStateCopy(helperState)
  const currentAvailability = profile?.availability_enabled === false ? 'No disponible' : 'Disponible'
  const skills = Array.isArray(profile?.skills) ? profile.skills : []

  return (
    <SettingsCard
      id="modo-ayudante"
      eyebrow="Ayudante"
      title="Modo ayudante"
      description="Controla la capa profesional de tu cuenta sin mezclarla con tu perfil base."
    >
      <div className={styles.featureHero}>
        <div>
          <span className={helperState === 'active' ? styles.readyBadge : styles.lockedBadge}>{copy.label}</span>
          <h3>{copy.title}</h3>
          <p>{copy.text}</p>
        </div>
        {copy.cta ? (
          <button type="button" className="primary-action" onClick={onStartHelperSetup}>
            {copy.cta}
          </button>
        ) : null}
      </div>

      <PublicProfilePreview mode="helper" />

      <div className={styles.settingsStack}>
        <div className={styles.premiumRow}>
          <div>
            <strong>Mostrar mi perfil en resultados</strong>
            <p>Tu perfil podrá aparecer cuando otras personas exploren helpers.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Preparado para conectar
          </button>
        </div>

        <div className={styles.premiumRow}>
          <div>
            <strong>Aceptar nuevas solicitudes</strong>
            <p>Control separado pendiente de activarse. Estado actual: {currentAvailability}.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Solo lectura
          </button>
        </div>

        <div className={styles.premiumPanel}>
          <div>
            <span className={styles.panelKicker}>Habilidades</span>
            <h3>Habilidades activas</h3>
            <p>Pronto podrás activar o pausar habilidades desde esta misma sección.</p>
          </div>
          <div className={styles.skillPills} aria-label="Habilidades de ayudante">
            {skills.length > 0 ? (
              skills.slice(0, 6).map((entry) => (
                <span key={entry?.skill?.id || entry?.id || entry?.skill_id}>
                  {entry?.skill?.name || entry?.name || 'Habilidad'}
                </span>
              ))
            ) : (
              <span>Sin habilidades publicadas todavía</span>
            )}
          </div>
        </div>

        <div className={styles.premiumPanel}>
          <div>
            <span className={styles.panelKicker}>Formación</span>
            <h3>Formación y certificados</h3>
            <p>Añade documentación que refuerce la confianza en tu perfil.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Preparado
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
