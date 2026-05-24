import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import styles from './StripePage.module.css'

export default function StripeReturn() {
  const navigate = useNavigate()
  const { user, loading, profileLoading, refreshProfile } = useAuth()
  const [checkingState, setCheckingState] = useState('loading')
  const [message, setMessage] = useState('Hemos recibido tu información. Estamos actualizando tu perfil de ayudante.')
  const hasResolvedRef = useRef(false)

  useEffect(() => {
    if (hasResolvedRef.current || loading || profileLoading) {
      return
    }

    hasResolvedRef.current = true

    if (!user) {
      setHelperHomeIntent('help')
      navigate('/login', {
        replace: true,
        state: { reason: 'stripe-return-no-session' },
      })
      return
    }

    let cancelled = false
    let redirectTimer = null

    async function runRefresh() {
      setCheckingState('loading')
      setMessage('Hemos recibido tu información. Estamos actualizando tu perfil de ayudante.')

      try {
        const nextProfile = await refreshProfile()

        if (cancelled) return

        setCheckingState('ready')
        setMessage(
          nextProfile?.stripe_onboarding_completed || nextProfile?.stripe_charges_enabled || nextProfile?.stripe_payouts_enabled
            ? 'Tu perfil ya está sincronizándose. En un momento verás tu Home de ayudante.'
            : 'Estamos actualizando tu perfil de ayudante. En un momento entrarás en Home modo help.',
        )
      } catch (error) {
        if (cancelled) return

        setCheckingState('error')
        setMessage(error?.message || 'No pudimos verificar tu perfil ahora mismo, pero vamos a llevarte a Home de ayudante.')
      }

      redirectTimer = window.setTimeout(() => {
        if (cancelled) return
        setHelperHomeIntent('help')
        navigate('/home', {
          replace: true,
          state: { mode: 'help' },
        })
      }, 700)
    }

    runRefresh()

    return () => {
      cancelled = true
      if (redirectTimer) {
        window.clearTimeout(redirectTimer)
      }
    }
  }, [loading, navigate, profileLoading, refreshProfile, user])

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Stripe Connect</p>
        <h1 className={styles.title}>Hemos recibido tu información</h1>
        <p className={styles.lead}>{message}</p>

        <div className={`${styles.statusCard} ${checkingState === 'error' ? styles.errorCard : ''}`}>
          <strong>Estado actual</strong>
          <p>
            {checkingState === 'loading'
              ? 'Sincronizando tu perfil...'
              : checkingState === 'error'
                ? 'No hemos podido verificar el estado todavía.'
                : 'La app está lista para continuar con el onboarding.'}
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setHelperHomeIntent('help')
              navigate('/login', {
                replace: true,
                state: { reason: 'stripe-return-manual' },
              })
            }}
          >
            Ir a login
          </button>
          <button type="button" className="primary-action" onClick={() => navigate('/home', { replace: true, state: { mode: 'help' } })}>
            Ir a Home
          </button>
        </div>
      </section>
    </main>
  )
}
