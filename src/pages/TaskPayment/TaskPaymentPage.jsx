import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { useTaskById } from '../../hooks/useTaskById'
import { supabase } from '../../lib/supabaseClient'
import { continueWithExternalPayment, startTaskCheckout } from '../../services/paymentsService'
import { getAvatarInitial } from '../../utils/avatar'
import styles from './TaskPaymentPage.module.css'

const FINAL_STATUSES = new Set(['completed', 'closed'])

function formatCurrency(value) {
  const amount = Number(value || 0)

  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number.isFinite(amount) ? amount : 0)
}

function getHelpfulLocationLabel(task) {
  const label = task?.location_label || task?.zone || task?.location || ''
  const normalized = label.trim().toLowerCase()

  if (!normalized || normalized === 'ubicación aproximada' || normalized === 'ubicacion aproximada') {
    return ''
  }

  return label
}

function getHelperName(helperProfile) {
  return helperProfile?.display_name || helperProfile?.full_name || helperProfile?.username || 'Ayudante asignado'
}

function getPaymentState(task, isOwner) {
  if (!task) return 'loading'
  if (!isOwner) return 'not_owner'
  if (task.status === 'assigned') return 'payable'
  if (task.status === 'in_progress') return 'confirmed'
  if (FINAL_STATUSES.has(task.status)) return 'final'
  if (task.status === 'open') return 'waiting_helper'
  if (task.status === 'cancelled') return 'cancelled'

  return 'not_payable'
}

function isActivePremiumSubscription(subscription) {
  if (!subscription) return false

  const status = subscription.subscription_status
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end).getTime() : null

  return ['active', 'trialing'].includes(status) && (!periodEnd || periodEnd > Date.now())
}

export default function TaskPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { task, loading, error } = useTaskById(id)
  const [premiumState, setPremiumState] = useState({
    loading: true,
    active: false,
    error: '',
  })

  const helperProfile = task?.accepted_profile || null
  const helperName = getHelperName(helperProfile)
  const helperInitial = getAvatarInitial(helperName)
  const isOwner = Boolean(user?.id && task?.created_by === user.id)
  const paymentState = getPaymentState(task, isOwner)
  const isPayable = paymentState === 'payable'
  const price = Number(task?.price || 0)
  const locationLabel = getHelpfulLocationLabel(task)

  const checkoutMutation = useMutation({
    mutationFn: () => startTaskCheckout(id),
    onSuccess: async ({ checkout_url }) => {
      await queryClient.invalidateQueries({ queryKey: ['task', id] })
      window.location.href = checkout_url
    },
  })

  const externalPaymentMutation = useMutation({
    mutationFn: () => continueWithExternalPayment(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      ])
      navigate(`/task/${id}`, {
        replace: true,
        state: { openChat: true, externalPayment: true },
      })
    },
  })

  useEffect(() => {
    let cancelled = false

    async function loadPremiumState() {
      if (!user?.id || !supabase) {
        setPremiumState({ loading: false, active: false, error: '' })
        return
      }

      setPremiumState((current) => ({ ...current, loading: true, error: '' }))

      try {
        const { data, error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .select('id, subscription_status, provider, current_period_end')
          .eq('user_id', user.id)
          .in('subscription_status', ['active', 'trialing'])
          .order('current_period_end', { ascending: false, nullsFirst: false })
          .limit(3)

        if (subscriptionError) {
          throw subscriptionError
        }

        if (cancelled) return

        setPremiumState({
          loading: false,
          active: (data || []).some(isActivePremiumSubscription),
          error: '',
        })
      } catch (subscriptionError) {
        if (cancelled) return

        setPremiumState({
          loading: false,
          active: false,
          error: subscriptionError?.message || 'No pudimos comprobar Premium.',
        })
      }
    }

    loadPremiumState()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyCard}>
          <p className={styles.eyebrow}>Pago</p>
          <h1>Cargando resumen...</h1>
          <p>Estamos preparando los datos de la tarea.</p>
        </section>
      </main>
    )
  }

  if (!task) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyCard}>
          <p className={styles.eyebrow}>Pago</p>
          <h1>Tarea no disponible</h1>
          <p className={styles.error}>{error || 'No hemos podido cargar esta tarea.'}</p>
          <button type="button" className="secondary-action" onClick={() => navigate('/home')}>
            Volver a Home
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="icon-button" onClick={() => navigate(`/task/${id}`)} aria-label="Volver">
          ←
        </button>
        <div>
          <p className={styles.eyebrow}>Pago</p>
          <h1>Confirmar y pagar</h1>
          <p className={styles.lead}>Revisa el importe antes de continuar con el pago.</p>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.confirmationCard}>
          <div className={styles.helperRow}>
            <span className={styles.avatar}>
              {helperProfile?.avatar_url ? <img src={helperProfile.avatar_url} alt={helperName} /> : helperInitial}
            </span>
            <div>
              <span>Helper seleccionado</span>
              <strong>{helperName}</strong>
              <p>{helperProfile?.rating ? `${helperProfile.rating}/5` : 'Listo para ayudarte'}</p>
            </div>
          </div>

          <div className={styles.taskSummary}>
            <span>Solicitud</span>
            <h2>{task.title}</h2>
            {task.description ? <p>{task.description}</p> : null}
            {locationLabel ? <small>{locationLabel}</small> : null}
          </div>
        </section>

        <aside className={styles.summaryCard}>
          <div className={styles.priceRows}>
            <div>
              <span>Precio acordado</span>
              <strong>{formatCurrency(price)}</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{formatCurrency(price)}</strong>
            </div>
          </div>

          {isPayable ? (
            <>
              <button
                type="button"
                className="primary-action"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Redirigiendo a Stripe...' : 'Confirmar y pagar'}
              </button>

              <section className={styles.premiumCompact}>
                <p>
                  El pago dentro de HelpMe confirma la tarea desde la plataforma. Con Premium también puedes acordar el
                  pago directamente con el helper.
                </p>

                {premiumState.active ? (
                  <button
                    type="button"
                    className={styles.premiumAction}
                    onClick={() => externalPaymentMutation.mutate()}
                    disabled={externalPaymentMutation.isPending}
                  >
                    {externalPaymentMutation.isPending ? 'Confirmando...' : 'Coordinar pago con el helper'}
                  </button>
                ) : (
                  <button type="button" className={styles.upsellButton} onClick={() => navigate('/settings')}>
                    {premiumState.loading ? 'Comprobando Premium...' : 'Ver Premium'}
                  </button>
                )}

                {premiumState.error ? <p className={styles.notice}>{premiumState.error}</p> : null}
                {externalPaymentMutation.error ? (
                  <p className={styles.error} role="alert">
                    {externalPaymentMutation.error?.message || 'No pudimos confirmar el pago externo.'}
                  </p>
                ) : null}
              </section>
            </>
          ) : (
            <>
              <p className={styles.notice}>
                {paymentState === 'confirmed'
                  ? 'La tarea ya está en curso. Vuelve al detalle para revisar el estado.'
                  : paymentState === 'final'
                    ? 'Esta tarea ya se cerró.'
                  : paymentState === 'waiting_helper'
                    ? 'Todavía no hay helper aceptado. Cuando alguien acepte, podrás pagar aquí.'
                    : paymentState === 'cancelled'
                      ? 'Esta tarea está cancelada y no se puede pagar.'
                      : paymentState === 'not_owner'
                        ? 'Solo quien publicó la tarea puede completar el pago.'
                        : 'No podemos completar el pago en este momento.'}
              </p>
              <button type="button" className="secondary-action" onClick={() => navigate(`/task/${id}`)}>
                Volver al detalle
              </button>
            </>
          )}
          {checkoutMutation.error ? (
            <p className={styles.error} role="alert">
              {checkoutMutation.error?.message || 'No hemos podido preparar el pago.'}
            </p>
          ) : null}
        </aside>
      </div>
    </main>
  )
}
