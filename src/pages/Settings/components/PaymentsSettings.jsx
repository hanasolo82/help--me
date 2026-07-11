import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from '../SettingsPage.module.css'
import { startStripeConnectOnboarding } from '../../../features/helper-onboarding/services/stripeConnectService'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

function getPaymentState(profile) {
  const helperStarted = Boolean(profile?.helper_enabled || (profile?.helper_status && profile.helper_status !== 'not_started'))

  if (!helperStarted) return 'locked'
  if (!profile?.stripe_onboarding_completed) return 'pending'
  if (profile?.stripe_charges_enabled && profile?.stripe_payouts_enabled) return 'active'

  return 'pending'
}

function getPaymentHeroTitle(paymentState) {
  if (paymentState === 'locked') return 'Los pagos se activan al completar el perfil de ayudante'
  if (paymentState === 'pending') return 'Completa la configuración para activar cobros'

  return 'Stripe conectado'
}

function getPaymentStateLabel(paymentState) {
  if (paymentState === 'active') return 'Conectado'
  if (paymentState === 'pending') return 'Configuración incompleta'

  return 'Sin perfil de ayudante'
}

// Sin bloque Premium: HelpMe no vende suscripción al uso (pivote de monetización).
// Aquí queda solo la conexión de cobros con Stripe; el seguimiento de gastos,
// cobros y justificantes vive en la página independiente /pagos.
export default function PaymentsSettings() {
  const { profile } = useSettings()
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const paymentState = getPaymentState(profile)
  const canContinueStripe = paymentState === 'pending'

  async function handleContinueStripe() {
    setStatus('loading')
    setError('')

    try {
      await startStripeConnectOnboarding()
    } catch (nextError) {
      setStatus('error')
      setError(nextError?.message || 'No pudimos abrir Stripe.')
    }
  }

  return (
    <SettingsCard
      id="pagos"
      eyebrow="Pagos"
      title="Pagos"
      description="La conexión de cobros con Stripe. El seguimiento de tus pagos vive en su propia página."
    >
      <div className={styles.infoGroup}>
        <span className={styles.panelKicker}>{getPaymentStateLabel(paymentState)}</span>
        <h3>{getPaymentHeroTitle(paymentState)}</h3>
        <p>
          {paymentState === 'active'
            ? 'Tu estado de Stripe indica que los cobros están conectados.'
            : 'No mostramos balances ni historial hasta que existan pagos reales asociados a tu cuenta.'}
        </p>
        {canContinueStripe ? (
          <button type="button" className="primary-action" onClick={handleContinueStripe} disabled={status === 'loading'}>
            {status === 'loading' ? 'Abriendo Stripe...' : 'Continuar en Stripe'}
          </button>
        ) : null}
        {error ? <p className="auth-message error" role="alert">{error}</p> : null}
      </div>

      <div className={styles.infoGroup}>
        <span className={styles.panelKicker}>Seguimiento</span>
        <h3>Gastos, cobros y justificantes</h3>
        <p>Consulta lo que has pagado y cobrado por tarea, tus datos de facturación y los justificantes.</p>
        <button type="button" className="secondary-action" onClick={() => navigate('/pagos')}>
          Ir a Pagos
        </button>
      </div>
    </SettingsCard>
  )
}
