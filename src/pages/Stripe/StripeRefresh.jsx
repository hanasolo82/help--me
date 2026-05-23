import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './StripePage.module.css'
import { startStripeConnectOnboarding } from '../../features/helper-onboarding/services/stripeConnectService'

export default function StripeRefresh() {
  const navigate = useNavigate()
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function restart() {
      try {
        await startStripeConnectOnboarding()
      } catch (nextError) {
        if (cancelled) return

        setState('error')
        setError(nextError?.message || 'No pudimos reanudar Stripe.')
      }
    }

    restart()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleRetry() {
    setState('loading')
    setError('')

    try {
      await startStripeConnectOnboarding()
    } catch (nextError) {
      setState('error')
      setError(nextError?.message || 'No pudimos reanudar Stripe.')
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Stripe Connect</p>
        <h1 className={styles.title}>Reanudando tu onboarding</h1>
        <p className={styles.lead}>
          El enlace anterior ya no es válido. Estamos generando uno nuevo para que puedas continuar.
        </p>

        <div className={`${styles.statusCard} ${state === 'error' ? styles.errorCard : ''}`}>
          <strong>Preparando acceso</strong>
          <p>{state === 'loading' ? 'Abriendo Stripe...' : error || 'Listo para reintentar.'}</p>
        </div>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding')}>
            Volver al onboarding
          </button>
          <button type="button" className="primary-action" onClick={handleRetry} disabled={state === 'loading'}>
            {state === 'loading' ? 'Preparando...' : 'Reintentar'}
          </button>
        </div>
      </section>
    </main>
  )
}
