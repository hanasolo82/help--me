import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { syncStripeConnectStatus } from '../../features/helper-onboarding/services/stripeConnectService'
import { helperOnboardingKeys } from '../../features/helper-onboarding/utils/helperOnboardingKeys'
import { getTaskById } from '../../services/tasksService'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import styles from './StripePage.module.css'

const PAYMENT_POLL_FAST_INTERVAL_MS = 1500
const PAYMENT_POLL_SLOW_INTERVAL_MS = 5000
const PAYMENT_WAITING_THRESHOLD_MS = 12_000
const PAYMENT_DELAYED_THRESHOLD_MS = 30_000
// Corta el polling para que no sea infinito: pasado este tope sin confirmación,
// mostramos un estado terminal de recuperación en vez de girar para siempre.
const PAYMENT_HARD_TIMEOUT_MS = 90_000

export default function StripeReturn() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user, loading, profileLoading, refreshProfile } = useAuth()
  const hasResolvedRef = useRef(false)
  const searchParams = new URLSearchParams(location.search)
  const flow = searchParams.get('flow') || 'helper-onboarding'
  const taskId = searchParams.get('task_id') || ''
  const paymentId = searchParams.get('payment_id') || ''
  const isPaymentFlow = flow === 'payment'
  const paymentReturnPath = taskId ? `/task/${taskId}` : '/home'
  const [checkingState, setCheckingState] = useState('loading')
  const [paymentRetryNonce, setPaymentRetryNonce] = useState(0)
  const [message, setMessage] = useState(
    isPaymentFlow
      ? 'Estamos confirmando tu pago con Stripe. Esto puede tardar unos segundos.'
      : 'Hemos recibido tu información. Estamos actualizando tu perfil de ayudante.',
  )

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

    if (isPaymentFlow && !taskId) {
      const missingTaskTimer = window.setTimeout(() => {
        setCheckingState('error')
        setMessage('No encontramos la tarea asociada a este retorno. Puedes volver al inicio sin repetir el pago.')
      }, 0)

      return () => {
        window.clearTimeout(missingTaskTimer)
      }
    }

    if (isPaymentFlow) {
      let cancelled = false
      let redirectTimer = null
      let pollTimer = null

      async function waitForTaskPromotion() {
        const startedAt = Date.now()
        setCheckingState('loading')
        setMessage('Estamos confirmando tu pago con Stripe. Esto puede tardar unos segundos.')

        try {
          await Promise.all([
            taskId ? queryClient.invalidateQueries({ queryKey: ['task', taskId] }) : Promise.resolve(),
            queryClient.invalidateQueries({ queryKey: ['tasks'] }),
          ])

          while (!cancelled) {
            const elapsedMs = Date.now() - startedAt

            // Tope duro: el pago no se confirmó a tiempo. Cortamos el polling y
            // pasamos a un estado terminal con acciones de recuperación.
            if (elapsedMs >= PAYMENT_HARD_TIMEOUT_MS) {
              setCheckingState('unconfirmed')
              setMessage(
                'No hemos podido confirmar tu pago todavía. No se ha perdido dinero: a veces Stripe tarda más de lo normal. Puedes reintentar la comprobación, volver a la tarea o contactar con soporte.',
              )
              return
            }

            if (elapsedMs >= PAYMENT_DELAYED_THRESHOLD_MS) {
              setCheckingState('delayed')
              setMessage(
                'Esto está tardando más de lo normal. Puedes volver al detalle; seguiremos comprobándolo.',
              )
            } else if (elapsedMs >= PAYMENT_WAITING_THRESHOLD_MS) {
              setCheckingState('waiting')
              setMessage('Seguimos esperando la confirmación segura de Stripe. No necesitas repetir el pago.')
            }

            const latestTask = taskId
              ? await queryClient.fetchQuery({
                  queryKey: ['task', taskId],
                  queryFn: () => getTaskById(taskId),
                })
              : null

            if (cancelled) return

            if (latestTask?.status === 'in_progress') {
              setCheckingState('confirmed')
              setMessage('Pago confirmado. La tarea ya está en curso. Volvemos al detalle ahora.')
              redirectTimer = window.setTimeout(() => {
                if (cancelled) return
                navigate(paymentReturnPath, {
                  replace: true,
                  state: {
                    openChat: true,
                    paymentCheckout: true,
                    paymentId: paymentId || null,
                    returnTo: '/home',
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
                navigate(paymentReturnPath, {
                  replace: true,
                  state: {
                    paymentCheckout: true,
                    paymentId: paymentId || null,
                    returnTo: '/home',
                  },
                })
              }, 700)
              return
            }

            await new Promise((resolve) => {
              const nextInterval =
                elapsedMs >= PAYMENT_DELAYED_THRESHOLD_MS
                  ? PAYMENT_POLL_SLOW_INTERVAL_MS
                  : PAYMENT_POLL_FAST_INTERVAL_MS
              pollTimer = window.setTimeout(resolve, nextInterval)
            })
          }
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
  }, [flow, loading, navigate, paymentId, paymentReturnPath, profileLoading, queryClient, refreshProfile, taskId, user, isPaymentFlow, paymentRetryNonce])

  // Reintenta la comprobación desde el estado terminal `unconfirmed`: reabre el
  // efecto de polling (resetea el guard y avanza el nonce) sin recargar la página.
  function handleRetryPaymentCheck() {
    hasResolvedRef.current = false
    setCheckingState('loading')
    setMessage('Reintentando la comprobación de tu pago con Stripe...')
    setPaymentRetryNonce((nonce) => nonce + 1)
  }

  function handleBackToTask() {
    navigate(paymentReturnPath, {
      replace: true,
      state: {
        paymentCheckout: true,
        paymentId: paymentId || null,
        returnTo: '/home',
      },
    })
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>{isPaymentFlow ? 'Pago' : 'Stripe Connect'}</p>
        <h1 className={styles.title}>
          {isPaymentFlow
            ? checkingState === 'confirmed'
              ? 'Pago confirmado'
              : checkingState === 'unconfirmed'
                ? 'No pudimos confirmar el pago'
                : checkingState === 'delayed'
                  ? 'Confirmación en curso'
                  : 'Confirmando tu pago'
            : 'Hemos recibido tu información'}
        </h1>
        <p className={styles.lead}>{message}</p>

        <div className={`${styles.statusCard} ${checkingState === 'error' || checkingState === 'unconfirmed' ? styles.errorCard : ''}`}>
          <strong>Estado actual</strong>
          <p>
            {isPaymentFlow
              ? checkingState === 'loading'
                ? 'Comprobando la tarea...'
                : checkingState === 'waiting'
                  ? 'Stripe aún está confirmando el pago de forma segura.'
                  : checkingState === 'delayed'
                    ? 'Seguimos comprobando el estado en segundo plano.'
                  : checkingState === 'unconfirmed'
                    ? 'No hemos podido confirmar el pago todavía. No se ha cobrado de más ni se ha perdido dinero.'
                  : checkingState === 'error'
                    ? 'No hemos podido verificar la tarea todavía.'
                    : checkingState === 'confirmed'
                      ? 'La tarea ya está en curso.'
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
            checkingState === 'unconfirmed' ? (
              <>
                <button type="button" className="primary-action" onClick={handleRetryPaymentCheck}>
                  Reintentar comprobación
                </button>
                <button type="button" className="secondary-action" onClick={handleBackToTask}>
                  {taskId ? 'Volver a la tarea' : 'Volver al inicio'}
                </button>
                <a
                  className="secondary-action"
                  href={`mailto:helpme.app.contact@gmail.com?subject=${encodeURIComponent(
                    `Pago sin confirmar${taskId ? ` (tarea ${taskId})` : ''}`,
                  )}`}
                >
                  Contactar soporte
                </a>
              </>
            ) : (
              <button type="button" className="secondary-action" onClick={handleBackToTask}>
                {taskId ? 'Volver al detalle' : 'Volver al inicio'}
              </button>
            )
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
      <ActionStatusOverlay
        open={isPaymentFlow && ['loading', 'waiting'].includes(checkingState)}
        title={checkingState === 'waiting' ? 'Seguimos esperando a Stripe...' : 'Confirmando tu pago...'}
        message={
          checkingState === 'waiting'
            ? 'La confirmación está tardando un poco más. No repitas el pago.'
            : 'Estamos verificando el estado real de la tarea antes de continuar.'
        }
      />
    </main>
  )
}
