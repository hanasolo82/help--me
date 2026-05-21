import styles from './BlockedHelperHome.module.css'
import { useHelperOnboardingProgress } from '../hooks/useHelperOnboardingProgress'
import {
  HELPER_STATUS,
  isHelperBlocked,
  isHelperUnderReview,
} from '../utils/helperPermissions'

const STATUS_COPY = {
  [HELPER_STATUS.NOT_STARTED]: 'Todavía no has empezado tu perfil de ayudante.',
  [HELPER_STATUS.PROFILE_INCOMPLETE]: 'Te faltan algunos datos para completar tu perfil.',
  [HELPER_STATUS.CONTACT_PENDING]:
    'Verifica tus datos de contacto para que la comunidad pueda confiar en tu perfil.',
  [HELPER_STATUS.IDENTITY_PENDING]:
    'Completa la verificación de identidad para poder aceptar solicitudes.',
  [HELPER_STATUS.TERMS_PENDING]: 'Acepta las normas de la comunidad para continuar.',
  [HELPER_STATUS.UNDER_REVIEW]:
    'Estamos revisando tu perfil. Cuando sea aprobado, podrás aparecer en el mapa y aceptar solicitudes.',
  [HELPER_STATUS.REJECTED]:
    'No hemos podido aprobar tu perfil. Revisa la información o contacta con soporte.',
  [HELPER_STATUS.SUSPENDED]: 'Tu perfil de ayudante está suspendido temporalmente.',
}

export default function BlockedHelperHome({ profile, onContinueHelperOnboarding, onNeedHelp }) {
  const { checklist, progress, helperStatus } = useHelperOnboardingProgress(profile)
  const statusText =
    STATUS_COPY[helperStatus] ||
    'Todavía no puedes aparecer en el mapa. Completa tu perfil de ayudante cuando quieras.'

  return (
    <section className={styles.shell} aria-label="Acceso de helper bloqueado">
      <div className={styles.frame}>
        <div className={styles.mapBlur} aria-hidden="true">
          <div className={styles.mapBadge}>Mapa deshabilitado hasta completar tu perfil</div>
        </div>

        <div className={styles.overlay}>
          <article className={styles.card}>
            <p className="eyebrow">Quiero ayudar</p>
            <h2 className={styles.title}>
              {isHelperUnderReview(profile) ? 'Tu perfil está en revisión' : 'Tu perfil todavía no puede aparecer en el mapa'}
            </h2>
            <p className={styles.copy}>{statusText}</p>

            <div className={styles.progress} aria-label="Progreso del perfil de ayudante">
              <strong>{progress}% completado</strong>
              <div className={styles.bar}>
                <span className={styles.fill} style={{ width: `${progress}%` }} />
              </div>
              <small className="muted">Estado actual: {helperStatus.replaceAll('_', ' ')}</small>
            </div>

            <ul className={styles.steps}>
              {checklist.map((item) => (
                <li key={item.label}>
                  {item.done ? '✓' : '•'} {item.label}
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <button type="button" className="primary-action" onClick={onContinueHelperOnboarding}>
                Continuar perfil de ayudante
              </button>
              <button type="button" className="secondary-action" onClick={onNeedHelp}>
                Ir a Necesito ayuda
              </button>
            </div>

            {isHelperBlocked(profile) ? (
              <p className={styles.helperNote}>
                Recomendación: completa primero tu perfil y las verificaciones para reforzar tu visibilidad y confianza.
              </p>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  )
}
