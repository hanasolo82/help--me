import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

function getPaymentState(profile) {
  if (profile?.helper_status !== 'active') return 'locked'
  if (!profile?.stripe_onboarding_completed) return 'pending'
  if (profile?.stripe_charges_enabled && profile?.stripe_payouts_enabled) return 'active'

  return 'pending'
}

function getPaymentHeroTitle(paymentState) {
  if (paymentState === 'locked') return 'Activa tu perfil de ayudante para acceder a cobros'
  if (paymentState === 'pending') return 'Completa la configuración para activar cobros'

  return 'Estructura de cobros preparada'
}

function getPaymentStateLabel(paymentState) {
  if (paymentState === 'active') return 'Conectado'
  if (paymentState === 'pending') return 'Pendiente de activación'

  return 'Bloqueado'
}

export default function PaymentsSettings() {
  const { profile, onStartHelperSetup } = useSettings()
  const paymentState = getPaymentState(profile)
  const isLocked = paymentState === 'locked'
  const isPending = paymentState === 'pending'

  return (
    <SettingsCard
      id="pagos"
      eyebrow="Pagos"
      title="Pagos"
      description="Gestiona cobros e ingresos cuando tu perfil de ayudante esté listo."
    >
      <div className={styles.featureHero}>
        <div>
          <span className={paymentState === 'active' ? styles.readyBadge : styles.lockedBadge}>
            {getPaymentStateLabel(paymentState)}
          </span>
          <h3>{getPaymentHeroTitle(paymentState)}</h3>
          <p>
            {isLocked
              ? 'Activa tu perfil de ayudante para acceder a cobros y gestionar ingresos.'
              : 'Los importes reales aparecerán solo cuando exista una fuente de pagos conectada y segura.'}
          </p>
        </div>
        {paymentState === 'active' ? (
          <button type="button" className={styles.disabledPill} disabled>
            Panel conectable
          </button>
        ) : (
          <button type="button" className="primary-action" onClick={onStartHelperSetup}>
            {isLocked ? 'Activar modo ayudante' : 'Completar configuración'}
          </button>
        )}
      </div>

      <div className={styles.paymentGrid}>
        {['Disponible', 'En tránsito', 'Pagado'].map((label) => (
          <article key={label} className={styles.paymentTile}>
            <span>{label}</span>
            <strong>No conectado</strong>
            <p>Se mostrará cuando haya pagos reales.</p>
          </article>
        ))}
      </div>

      <div className={styles.premiumPanel}>
        <div>
          <span className={styles.panelKicker}>Estado de cobros</span>
          <h3>{paymentState === 'active' ? 'Cobros preparados para conectar' : 'Cobros no disponibles todavía'}</h3>
          <p>HelpMe no mostrará saldos, ingresos ni historial hasta tener una fuente real y segura.</p>
        </div>
        <button type="button" className={styles.disabledPill} disabled>
          Cómo funcionan los pagos
        </button>
      </div>
    </SettingsCard>
  )
}
