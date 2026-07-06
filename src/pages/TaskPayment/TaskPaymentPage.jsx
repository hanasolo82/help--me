import { useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { useTaskById } from '../../hooks/useTaskById'
import { PRICING_COPY } from '../../config/pricing'
import { refundTaskPayment, startTaskCheckout } from '../../services/paymentsService'
import { getAvatarInitial } from '../../utils/avatar'
import UserAvatar from '../../shared/ui/UserAvatar'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../shared/ui/Modal/Modal'
import { resolveReturnTo } from '../../shared/utils/navigation'
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

export default function TaskPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { user } = useAuth()
  const { task, loading, error } = useTaskById(id)
  const checkoutStartedAtRef = useRef(null)
  const queryClient = useQueryClient()
  const [refundModalOpen, setRefundModalOpen] = useState(false)

  const helperProfile = task?.accepted_profile || null
  const helperName = getHelperName(helperProfile)
  const helperInitial = getAvatarInitial(helperName)
  const isOwner = Boolean(user?.id && task?.created_by === user.id)
  const paymentState = getPaymentState(task, isOwner)
  const isPayable = paymentState === 'payable'
  const price = Number(task?.price || 0)
  const locationLabel = getHelpfulLocationLabel(task)
  const taskPath = `/task/${id}`
  const returnTo = resolveReturnTo(routeLocation.state?.returnTo, taskPath)

  const checkoutMutation = useMutation({
    mutationFn: () => {
      checkoutStartedAtRef.current = performance.now()

      if (import.meta.env.DEV) {
        console.info('[checkout] click', { taskId: id })
      }

      return startTaskCheckout(id, {
        onTiming: (timing) => {
          if (import.meta.env.DEV) {
            console.info('[checkout] timing', { taskId: id, ...timing })
          }
        },
      })
    },
    onSuccess: ({ checkout_url }) => {
      if (import.meta.env.DEV && checkoutStartedAtRef.current !== null) {
        console.info('[checkout] redirect', {
          taskId: id,
          durationMs: Math.round(performance.now() - checkoutStartedAtRef.current),
        })
      }

      window.location.assign(checkout_url)
    },
  })

  const refundMutation = useMutation({
    mutationFn: () => refundTaskPayment(id),
    onSuccess: async () => {
      setRefundModalOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task', id] }),
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
      ])
      navigate(returnTo)
    },
  })

  if (loading) {
    return (
      <main className={styles.page} aria-busy="true">
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
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" className="icon-button" onClick={() => navigate(returnTo)} aria-label="Volver">
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
            <UserAvatar
              src={helperProfile?.avatar_url}
              name={helperName || helperInitial}
              alt={helperName}
              size="md"
              variant="rounded"
              className={styles.avatar}
            />
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
            <div>
              <span>{PRICING_COPY.paymentValue}</span>
              <strong>Incluido</strong>
            </div>
            <div className={styles.totalRow}>
              <span>Total</span>
              <strong>{formatCurrency(price)}</strong>
            </div>
          </div>
          <p className={styles.notice}>{PRICING_COPY.heldUntilConfirm}</p>

          {isPayable ? (
            <>
              <button
                type="button"
                className="primary-action"
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? 'Preparando pago...' : PRICING_COPY.paymentCta}
              </button>
            </>
          ) : (
            <>
              <p className={styles.notice}>
                {paymentState === 'confirmed'
                  ? 'La tarea ya está en curso con el pago retenido. Puedes volver al detalle o pedir la devolución total mientras no liberes el pago.'
                  : paymentState === 'final'
                    ? 'Esta tarea ya se cerró.'
                  : paymentState === 'waiting_helper'
                    ? 'Todavía no hay helper elegido. Cuando elijas uno, podrás pagar aquí.'
                    : paymentState === 'cancelled'
                      ? 'Esta tarea está cancelada y no se puede pagar.'
                      : paymentState === 'not_owner'
                        ? 'Solo quien publicó la tarea puede completar el pago.'
                        : 'No podemos completar el pago en este momento.'}
              </p>
              <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
                Volver al detalle
              </button>
              {paymentState === 'confirmed' && isOwner ? (
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setRefundModalOpen(true)}
                  disabled={refundMutation.isPending}
                >
                  Solicitar devolución
                </button>
              ) : null}
            </>
          )}
          {checkoutMutation.error ? (
            <p className={styles.error} role="alert">
              {checkoutMutation.error?.message || 'No hemos podido preparar el pago.'}
            </p>
          ) : null}
          {refundMutation.error ? (
            <p className={styles.error} role="alert">
              {refundMutation.error?.message || 'No hemos podido procesar la devolución.'}
            </p>
          ) : null}
        </aside>
      </div>

      <Modal open={refundModalOpen} onClose={() => setRefundModalOpen(false)} size="sm">
        <ModalHeader eyebrow="Devolución" title="¿Devolver el pago completo?" />
        <ModalBody>
          <p>
            Te devolveremos <strong>{formatCurrency(price)}</strong> al método de pago original y la tarea quedará
            cancelada. El helper dejará de verla como activa.
          </p>
          <p className="muted">
            Solo es posible mientras el pago siga retenido; una vez liberado al helper ya no hay devolución.
          </p>
        </ModalBody>
        <ModalActions>
          <button
            type="button"
            className="secondary-action"
            onClick={() => setRefundModalOpen(false)}
            disabled={refundMutation.isPending}
          >
            Mantener el pago
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={() => refundMutation.mutate()}
            disabled={refundMutation.isPending}
            data-autofocus
          >
            {refundMutation.isPending ? 'Procesando…' : 'Devolver el pago'}
          </button>
        </ModalActions>
      </Modal>
      <ActionStatusOverlay
        open={checkoutMutation.isPending}
        title="Preparando pago..."
        message="Estamos conectando con Stripe. No cierres esta pantalla ni vuelvas a pulsar el botón."
      />
      <ActionStatusOverlay
        open={refundMutation.isPending}
        title="Procesando devolución..."
        message="Estamos pidiendo a Stripe la devolución total. No cierres esta pantalla."
      />
    </main>
  )
}
