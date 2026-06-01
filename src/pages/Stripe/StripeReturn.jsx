import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { syncStripeConnectStatus } from '../../features/helper-onboarding/services/stripeConnectService'
import { helperOnboardingKeys } from '../../features/helper-onboarding/utils/helperOnboardingKeys'
import styles from './StripePage.module.css'

export default function StripeReturn() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user, loading, profileLoading, refreshProfile } = useAuth()
  const [checkingState, setCheckingState] = useState('loading')
  const [message, setMessage] = useState('Hemos recibido tu información. Estamos actualizando tu perfil de ayudante.')
  const hasResolvedRef = useRef(false)
  const searchParams = new URLSearchParams(location.search)
  const flow = searchParams.get('flow') || 'helper-onboarding'
  const taskId = searchParams.get('task_id') || ''
  const paymentId = searchParams.get('payment_id') || ''

  useEffect(() => {
    if (hasResolvedRef.current || loading || profileLoading) {
      return
    }

    hasResolvedRef.current = true

    if (flow === 'payment') {
      let cancelled = false
      let redirectTimer = null

      async function runPaymentReturn() {
        setCheckingState('loading')
        setMessage('Hemos confirmado el pago. Estamos actualizando el estado de la tarea.')

        try {
          await Promise.all([
            taskId ? queryClient.invalidateQueries({ queryKey: ['task', taskId] }) : Promise.resolve(),
            queryClient.invalidateQueries({ queryKey: ['tasks'] }),
          ])

          if (cancelled) return

          setCheckingState('ready')
          setMessage('Tu pago quedó preparado correctamente. Volveremos al detalle de la tarea.')
        } catch (error) {
          if (cancelled) return

          setCheckingState('error')
          setMessage(error?.message || 'No pudimos refrescar la tarea ahora mismo.')
        }

        redirectTimer = window.setTimeout(() => {
          if (cancelled) return
          navigate(taskId ? `/task/${taskId}` : '/home', {
            replace: true,
            state: {
              paymentCheckout: true,
              paymentId: paymentId || null,
            },
          })
        }, 700)
      }

      runPaymentReturn()

      return () => {
        cancelled = true
        if (redirectTimer) {
          window.clearTimeout(redirectTimer)
        }
      }
    }

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
        await syncStripeConnectStatus()
        const nextProfile = await refreshProfile()
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['profile'] }),
          queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.verifications(nextProfile?.id || user?.id) }),
          queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.skills(nextProfile?.id || user?.id) }),
          queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.availability(nextProfile?.id || user?.id) }),
          queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.phoneContact(nextProfile?.id || user?.id) }),
        ])

        if (cancelled) return

        setCheckingState('ready')
        setMessage(
          nextProfile?.stripe_onboarding_completed || nextProfile?.stripe_charges_enabled || nextProfile?.stripe_payouts_enabled
            ? 'Tu perfil ya está sincronizándose. Volverás al paso final para terminar la activación.'
            : 'Estamos actualizando tu perfil de ayudante. Volverás al paso final para terminar la activación.',
        )
      } catch (error) {
        if (cancelled) return

        setCheckingState('error')
        setMessage(error?.message || 'No pudimos verificar tu perfil ahora mismo, pero volverás al paso final de activación.')
      }

      redirectTimer = window.setTimeout(() => {
        if (cancelled) return
        setHelperHomeIntent('help')
        navigate('/home', {
          replace: true,
          state: { mode: 'help', resumeHelperOnboarding: true, preferredStep: 'identity' },
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
  }, [flow, loading, navigate, paymentId, profileLoading, queryClient, refreshProfile, taskId, user])

  return (
    <main className={styles.page}>
      <section className={styles.card}>
          <p className={styles.eyebrow}>{flow === 'payment' ? 'Pago' : 'Stripe Connect'}</p>
        <h1 className={styles.title}>
          {flow === 'payment' ? 'Hemos recibido tu pago' : 'Hemos recibido tu información'}
        </h1>
        <p className={styles.lead}>{message}</p>

        <div className={`${styles.statusCard} ${checkingState === 'error' ? styles.errorCard : ''}`}>
          <strong>Estado actual</strong>
          <p>
            {checkingState === 'loading'
              ? flow === 'payment'
                ? 'Confirmando el pago...'
                : 'Sincronizando tu perfil...'
              : checkingState === 'error'
                ? flow === 'payment'
                  ? 'No hemos podido verificar el pago todavía.'
                  : 'No hemos podido verificar el estado todavía.'
                : flow === 'payment'
                  ? 'El pago ya quedó registrado.'
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
          <button
            type="button"
            className="primary-action"
            onClick={() =>
              navigate('/home', {
                replace: true,
                state: { mode: 'help', resumeHelperOnboarding: true, preferredStep: 'identity' },
              })
            }
          >
            Ir a Home
          </button>
        </div>
      </section>
    </main>
  )
}
