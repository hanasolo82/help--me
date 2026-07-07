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
      {/* Bloque Premium estilo "YouTube Premium": hero + precio + un CTA,
          beneficios con ✓ y comparativa Free vs Premium. El CTA solo lanza el
          checkout/portal de Stripe ya existentes: aquí no se tocan tarjetas. */}
      <section className={styles.premiumShell} aria-label="Plan helpMe Premium">
        <header className={styles.premiumHead}>
          <p className={styles.premiumBrand}>
            helpMe <span className={styles.premiumBrandBadge}>Premium</span>
          </p>
          {isPremium ? <span className={styles.premiumCurrentPill}>Plan actual</span> : null}
        </header>

        <h3 className={styles.premiumTitle}>Saca más partido a tu barrio</h3>
        <p className={styles.premiumSubtitle}>{PREMIUM_PLAN.tagline}</p>

        <p className={styles.premiumPrice}>
          <strong>{PREMIUM_PLAN.priceLabel}</strong>
          <span> · cancela cuando quieras</span>
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
            className={`secondary-action ${styles.premiumCta}`}
            onClick={handleManage}
            disabled={premiumStatus === 'loading'}
          >
            {premiumStatus === 'loading' ? 'Abriendo portal...' : 'Gestionar suscripción'}
          </button>
        ) : (
          <button
            type="button"
            className={`primary-action ${styles.premiumCta}`}
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

        <ul className={styles.premiumChecklist}>
          {PREMIUM_PLAN.features.map((feature) => (
            <li key={feature}>
              <span className={styles.premiumCheck} aria-hidden="true">
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className={styles.premiumCompare} role="table" aria-label="Comparativa Free frente a Premium">
          <div className={`${styles.premiumCompareRow} ${styles.premiumCompareHead}`} role="row">
            <span role="columnheader">Qué incluye</span>
            <span role="columnheader">Free</span>
            <span role="columnheader" className={styles.premiumCompareBrandCol}>
              Premium
            </span>
          </div>
          {[
            { label: 'Publicar solicitudes y recibir ayuda', free: true },
            { label: 'Chat y pago retenido hasta confirmar', free: true },
            { label: 'Pago externo: coordinar el pago fuera de HelpMe', free: false },
            { label: 'Acceso prioritario a nuevas funciones', free: false },
            { label: 'Soporte con prioridad', free: false },
          ].map((row) => (
            <div key={row.label} className={styles.premiumCompareRow} role="row">
              <span role="cell">{row.label}</span>
              <span role="cell" aria-label={row.free ? 'Incluido en Free' : 'No incluido en Free'}>
                {row.free ? '✓' : '—'}
              </span>
              <span role="cell" className={styles.premiumCompareBrandCol} aria-label="Incluido en Premium">
                ✓
              </span>
            </div>
          ))}
        </div>

        <p className={styles.premiumLegal}>
          Facturación periódica gestionada por Stripe · cancela cuando quieras desde el portal.
        </p>
      </section>

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
