import mapaCalleImage from '../../../assets/images/mapa_calle.png'
import styles from './BlockedHelperHome.module.css'
import { useHelperOnboardingProgress } from '../hooks/useHelperOnboardingProgress'
import {
  HELPER_STATUS,
  isHelperBlocked,
} from '../utils/helperPermissions'

const STATUS_LABEL = {
  [HELPER_STATUS.NOT_STARTED]: 'Pendiente de empezar',
  [HELPER_STATUS.PROFILE_INCOMPLETE]: 'Perfil en construcción',
  [HELPER_STATUS.CONTACT_PENDING]: 'Contacto por añadir',
  [HELPER_STATUS.IDENTITY_PENDING]: 'Confianza pendiente',
  [HELPER_STATUS.TERMS_PENDING]: 'Condiciones pendientes',
  [HELPER_STATUS.ACTIVE]: 'Listo para aparecer',
  [HELPER_STATUS.REJECTED]: 'Revisión necesaria',
  [HELPER_STATUS.SUSPENDED]: 'Visibilidad pausada',
}

const STATUS_COPY = {
  [HELPER_STATUS.NOT_STARTED]:
    'Aún no has empezado tu perfil de ayudante. Cuando quieras, puedes completarlo a tu ritmo.',
  [HELPER_STATUS.PROFILE_INCOMPLETE]:
    'Te faltan algunos detalles para presentar un perfil claro, útil y confiable.',
  [HELPER_STATUS.CONTACT_PENDING]:
    'Añadir un medio de contacto ayuda a reforzar la confianza y la recuperación de cuenta.',
  [HELPER_STATUS.IDENTITY_PENDING]:
    'Completar este paso ayuda a que tu perfil se vea más sólido y fiable.',
  [HELPER_STATUS.TERMS_PENDING]:
    'Solo falta confirmar las condiciones para poder seguir adelante con tranquilidad.',
  [HELPER_STATUS.REJECTED]:
    'Hemos pausado tu visibilidad por ahora. Puedes revisar la información y volver a intentarlo.',
  [HELPER_STATUS.SUSPENDED]:
    'Tu visibilidad está pausada temporalmente. Cuando esté resuelto, podrás seguir con normalidad.',
}

const CHECKLIST_COPY = {
  'Perfil base': 'Añade una presentación clara para que las personas sepan quién eres.',
  'Ubicación': 'Activa tu zona para aparecer en búsquedas cercanas.',
  'Skills': 'Selecciona los servicios que puedes ofrecer.',
  'Disponibilidad': 'Marca los días en los que sueles estar disponible.',
  'Verificación': 'Completa los últimos pasos de confianza para activar tu perfil.',
}

export default function BlockedHelperHome({ profile, onContinueHelperOnboarding, onNeedHelp }) {
  const { checklist, progress, helperStatus } = useHelperOnboardingProgress(profile)
  const statusText =
    STATUS_COPY[helperStatus] ||
    'Todavía no puedes aparecer en el mapa. Completa tu perfil de ayudante cuando quieras.'

  return (
    <section className={styles.shell} aria-label="Acceso de helper bloqueado">
      <div className={styles.frame}>
        <div className={styles.mapPreview} aria-hidden="true">
          <img className={styles.mapImage} src={mapaCalleImage} alt="" />
          <div className={styles.mapWash} />
          <div className={styles.mapGlow} />
          <div className={styles.mapBadge}>Visibilidad pendiente</div>
          <div className={styles.mapPin} />
          <div className={styles.mapOrbit} />
        </div>

        <div className={styles.overlay}>
          <article className={styles.card}>
            <div className={styles.heroRow}>
              <div>
                <p className="eyebrow">Quiero ayudar</p>
                <h2 className={styles.title}>
                  Tu visibilidad todavía no está activa
                </h2>
              </div>

              <span className={styles.stateLabel}>{STATUS_LABEL[helperStatus] || 'Pendiente'}</span>
            </div>

            <p className={styles.copy}>{statusText}</p>

            <div className={styles.trustNote}>
              Estos pasos nos ayudan a mantener una comunidad más cuidada y a mostrar perfiles claros, útiles y confiables.
            </div>

            <div className={styles.progressCard} aria-label="Progreso del perfil de ayudante">
              <div className={styles.progressHeader}>
                <strong>{progress}% completado</strong>
                
              </div>
              <div className={styles.bar} role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
                <span className={styles.fill} style={{ width: `${progress}%` }} />
              </div>
            </div>

            <ul className={styles.steps}>
              {checklist.map((item) => (
                <li key={item.label} className={styles.stepItem}>
                  <span className={styles.stepMark} aria-hidden="true">
                    {item.done ? '✓' : '•'}
                  </span>
                  <div className={styles.stepCopy}>
                    <strong>{item.label}</strong>
                    <p>{CHECKLIST_COPY[item.label] || 'Completa este paso para seguir avanzando.'}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className={styles.actions}>
              <button type="button" className="primary-action" onClick={onContinueHelperOnboarding}>
                Continuar perfil de ayudante
              </button>
              <button type="button" className="secondary-action" onClick={onNeedHelp}>
                Pedir ayuda por ahora
              </button>
            </div>

            {isHelperBlocked(profile) ? (
              <p className={styles.helperNote}>
                Recomendación: completa primero tu perfil para reforzar tu visibilidad y confianza.
              </p>
            ) : null}
          </article>
        </div>
      </div>
    </section>
  )
}
