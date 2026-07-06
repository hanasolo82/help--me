import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import styles from '../SettingsPage.module.css'
import { startStripeConnectOnboarding } from '../../../features/helper-onboarding/services/stripeConnectService'
import { startPremiumCheckout, openBillingPortal } from '../../../services/billingService'
import { usePremiumStatus } from '../../../hooks/usePremiumStatus'
import { PREMIUM_PLAN } from '../../../config/pricing'
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

export default function PaymentsSettings() {
  const { profile } = useSettings()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [premiumStatus, setPremiumStatus] = useState('idle')
  const [premiumError, setPremiumError] = useState('')
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus(profile?.id)
  const paymentState = getPaymentState(profile)
  const canContinueStripe = paymentState === 'pending'
  // Retorno del checkout de Stripe (?premium=success|cancelled en la URL).
  const premiumReturn = searchParams.get('premium')

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

  async function handleSubscribe() {
    setPremiumStatus('loading')
    setPremiumError('')

    try {
      const { checkout_url: checkoutUrl } = await startPremiumCheckout()
      window.location.assign(checkoutUrl)
    } catch (nextError) {
      setPremiumStatus('error')
      setPremiumError(nextError?.message || 'No pudimos preparar la suscripción.')
    }
  }

  async function handleManage() {
    setPremiumStatus('loading')
    setPremiumError('')

    try {
      const { portal_url: portalUrl } = await openBillingPortal()
      window.location.assign(portalUrl)
    } catch (nextError) {
      setPremiumStatus('error')
      setPremiumError(nextError?.message || 'No pudimos abrir el portal de facturación.')
    }
  }

  return (
    <SettingsCard
      id="pagos"
      eyebrow="Pagos"
      title="Pagos"
      description="Tu plan, el pago retenido y los cobros de ayudante, en un solo sitio."
    >
      <div className={styles.infoGroup}>
        <span className={styles.panelKicker}>{isPremium ? 'Premium activo' : 'Plan'}</span>
        <h3>{PREMIUM_PLAN.name}</h3>
        <p>{PREMIUM_PLAN.tagline}</p>
        <ul>
          {PREMIUM_PLAN.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        <p>
          <strong>{PREMIUM_PLAN.priceLabel}</strong> · cancela cuando quieras desde el portal.
        </p>

        {premiumReturn === 'success' ? (
          <p className="auth-message" role="status">
            Suscripción completada. Si aún no aparece como activa, se confirmará en unos segundos.
          </p>
        ) : null}
        {premiumReturn === 'cancelled' ? (
          <p className="muted" role="status">
            Has cancelado el proceso de suscripción. Puedes retomarlo cuando quieras.
          </p>
        ) : null}

        {isPremium ? (
          <button
            type="button"
            className="secondary-action"
            onClick={handleManage}
            disabled={premiumStatus === 'loading'}
          >
            {premiumStatus === 'loading' ? 'Abriendo portal...' : 'Gestionar suscripción'}
          </button>
        ) : (
          <button
            type="button"
            className="primary-action"
            onClick={handleSubscribe}
            disabled={premiumStatus === 'loading' || premiumLoading}
          >
            {premiumStatus === 'loading' ? 'Preparando suscripción...' : 'Hazte Premium'}
          </button>
        )}
        {premiumError ? (
          <p className="auth-message error" role="alert">
            {premiumError}
          </p>
        ) : null}
      </div>

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
    </SettingsCard>
  )
}
