import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { syncStripeConnectStatus } from '../../features/helper-onboarding/services/stripeConnectService'
import { helperOnboardingKeys } from '../../features/helper-onboarding/utils/helperOnboardingKeys'
import { getTaskById } from '../../services/tasksService'
import styles from './StripePage.module.css'

const PAYMENT_POLL_INTERVAL_MS = 1500
const PAYMENT_POLL_ATTEMPTS = 8

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
  const isPaymentFlow = flow === 'payment'

  useEffect(() => {
    if (hasResolvedRef.current || loading || profileLoading) {
      return undefined
    }

    hasResolvedRef.current = true

    if (isPaymentFlow && !user) {
      navigate('/login', {
        replace: true,
        state: { reason: 'stripe-return-payment-no-session' },
      })
      return undefined
    }

    if (isPaymentFlow) {
      let cancelled = false
      let redirectTimer = null
      let pollTimer = null

      async function waitForTaskPromotion() {
        setCheckingState('loading')
        setMessage('Pago recibido. Estamos confirmando la tarea. Esto puede tardar unos segundos.')

        try {
          await Promise.all([
            taskId ? queryClient.invalidateQueries({ queryKey: ['task', taskId] }) : Promise.resolve(),
            queryClient.invalidateQueries({ queryKey: ['tasks'] }),
          ])

          for (let attempt = 0; attempt < PAYMENT_POLL_ATTEMPTS; attempt += 1) {
            const latestTask = taskId
              ? await queryClient.fetchQuery({
                  queryKey: ['task', taskId],
                  queryFn: () => getTaskById(taskId),
                })
              : null

            if (cancelled) return

            if (latestTask?.status === 'in_progress') {
              setCheckingState('ready')
              setMessage('La tarea ya está en curso. Volvemos al detalle ahora.')
              redirectTimer = window.setTimeout(() => {
                if (cancelled) return
                navigate(taskId ? `/task/${taskId}` : '/home', {
                  replace: true,
                  state: {
                    openChat: true,
                    paymentCheckout: true,
                    paymentId: paymentId || null,
                  },
                })
              }, 700)
              return
            }

            if (latestTask?.status && latestTask.status !== 'assigned') {
              setCheckingState('ready')
              setMessage('La tarea ya se actualizó. Volveremos al detalle para revisar el estado.')
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
              return
            }

            if (attempt < PAYMENT_POLL_ATTEMPTS - 1) {
              await new Promise((resolve) => {
                pollTimer = window.setTimeout(resolve, PAYMENT_POLL_INTERVAL_MS)
              })
            }
          }

          if (cancelled) return

          setCheckingState('pending')
          setMessage('Todavía estamos confirmando la tarea. Puedes volver al detalle y revisar el estado actual.')
        } catch (error) {
          if (cancelled) return

          setCheckingState('error')
          setMessage(error?.message || 'No pudimos verificar la tarea ahora mismo.')
        }
      }

      waitForTaskPromotion()

      return () => {
        cancelled = true
        if (redirectTimer) {
          window.clearTimeout(redirectTimer)
        }
        if (pollTimer) {
          window.clearTimeout(pollTimer)
        }
      }
    }

    if (!user) {
      setHelperHomeIntent('help')
      navigate('/login', {
        replace: true,
        state: { reason: 'stripe-return-no-session' },
      })
      return undefined
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
  }, [flow, loading, navigate, paymentId, profileLoading, queryClient, refreshProfile, taskId, user, isPaymentFlow])

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{isPaymentFlow ? 'Pago' : 'Stripe Connect'}</p>
        <h1 className={styles.title}>{isPaymentFlow ? 'Pago recibido' : 'Hemos recibido tu información'}</h1>
        <p className={styles.lead}>{isPaymentFlow ? 'Estamos confirmando la tarea. Esto puede tardar unos segundos.' : message}</p>

        <div className={`${styles.statusCard} ${checkingState === 'error' ? styles.errorCard : ''}`}>
          <strong>Estado actual</strong>
          <p>
            {isPaymentFlow
              ? checkingState === 'loading'
                ? 'Comprobando la tarea...'
                : checkingState === 'pending'
                  ? 'La tarea aún se está actualizando.'
                  : checkingState === 'error'
                    ? 'No hemos podido verificar la tarea todavía.'
                    : 'La tarea ya está lista para continuar.'
              : checkingState === 'loading'
                ? 'Sincronizando tu perfil...'
                : checkingState === 'error'
                  ? 'No hemos podido verificar el estado todavía.'
                  : 'La app está lista para continuar con el onboarding.'}
          </p>
        </div>

        <div className={styles.actions}>
          {isPaymentFlow ? (
            <button
              type="button"
              className="secondary-action"
              onClick={() =>
                navigate(taskId ? `/task/${taskId}` : '/home', {
                  replace: true,
                  state: {
                    paymentCheckout: true,
                    paymentId: paymentId || null,
                  },
                })
              }
            >
              Volver al detalle
            </button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>
    </main>
  )
}
