import { useNavigate } from 'react-router-dom'
import { canOfferHelp, needsHelperProfile } from '../utils/helperPermissions'
import styles from './HelperGate.module.css'

export default function HelperGate({ profile }) {
  const navigate = useNavigate()
  const helperReady = canOfferHelp(profile)
  const blocked = needsHelperProfile(profile)

  if (!profile || helperReady || !blocked) {
    return null
  }

  return (
    <section className={styles.gate}>
      <div className={styles.header}>
        <p className="eyebrow">Necesita completarse</p>
        <h2 className={styles.title}>Tu perfil de helper aún no está listo</h2>
        <p className={styles.copy}>
          Para aparecer en el tablón de ayuda necesitamos que completes los datos mínimos del flujo de helpers.
        </p>
      </div>

      <ul className={styles.steps}>
        <li>Activa disponibilidad.</li>
        <li>Completa ubicación y zona.</li>
        <li>Deja lista la verificación básica.</li>
      </ul>

      <div className={styles.actions}>
        <button type="button" className="primary-action" onClick={() => navigate('/onboarding', { state: { mode: 'help' } })}>
          Completar perfil de helper
        </button>
        <button type="button" className="secondary-action" onClick={() => navigate('/settings')}>
          Revisar perfil
        </button>
      </div>
    </section>
  )
}
