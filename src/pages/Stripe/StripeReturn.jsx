import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import styles from './StripePage.module.css'

export default function StripeReturn() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const [checkingState, setCheckingState] = useState('loading')
  const [message, setMessage] = useState('Estamos comprobando el estado de tu cuenta.')

  useEffect(() => {
    let cancelled = false

    async function runRefresh() {
      try {
        await refreshProfile()

        if (cancelled) return

        setCheckingState('ready')
        setMessage(
          profile?.stripe_onboarding_completed
            ? 'Tu cuenta ya se está sincronizando y tu perfil está listo para seguir el proceso.'
            : 'Hemos recibido tu información. Estamos comprobando el estado de tu cuenta.',
        )
      } catch (error) {
        if (cancelled) return
        setCheckingState('error')
        setMessage(error?.message || 'No pudimos comprobar el estado de tu cuenta ahora mismo.')
      }
    }

    runRefresh()

    return () => {
      cancelled = true
    }
  }, [profile?.stripe_onboarding_completed, refreshProfile])

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
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding')}>
            Volver al onboarding
          </button>
          <button type="button" className="primary-action" onClick={() => navigate('/home')}>
            Ir a Home
          </button>
        </div>
      </section>
    </main>
  )
}
