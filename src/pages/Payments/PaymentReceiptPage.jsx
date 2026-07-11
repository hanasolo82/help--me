import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { getPaymentById } from '../../services/paymentsService'
import { getMyBillingProfile } from '../../services/billingProfileService'
import { formatEuro } from '../../lib/currency'
import { getStatusInfo } from './paymentStatus'
import styles from './PaymentReceipt.module.css'

const DATE_FORMAT = { day: '2-digit', month: 'long', year: 'numeric' }

function formatCents(cents) {
  return formatEuro((Number(cents) || 0) / 100)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-ES', DATE_FORMAT)
}

function buildReceiptNumber(payment, billingProfile) {
  const prefix = billingProfile?.invoice_prefix || 'HM'
  const createdAt = new Date(payment.created_at || Date.now())
  const year = Number.isNaN(createdAt.getTime()) ? new Date().getFullYear() : createdAt.getFullYear()
  return `${prefix}-${year}-${payment.id.slice(0, 8).toUpperCase()}`
}

function hasBillingData(billingProfile) {
  if (!billingProfile) return false
  return Boolean(
    billingProfile.legal_name ||
      billingProfile.tax_id ||
      billingProfile.address_line ||
      billingProfile.city,
  )
}

// /pagos/justificante/:paymentId — documento imprimible de un pago (como
// solicitante) o un cobro (como helper). Informativo: no es factura fiscal.
export default function PaymentReceiptPage() {
  const { paymentId } = useParams()
  const { user } = useAuth()

  const paymentQuery = useQuery({
    queryKey: ['payment-receipt', paymentId],
    queryFn: ({ signal }) => getPaymentById(paymentId, { signal }),
    enabled: Boolean(user?.id && paymentId),
    staleTime: 30_000,
    retry: false,
  })

  const billingQuery = useQuery({
    queryKey: ['my-billing-profile', user?.id],
    queryFn: ({ signal }) => getMyBillingProfile({ signal }),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })

  if (paymentQuery.isPending || billingQuery.isPending) {
    return (
      <main className={styles.page}>
        <p className="muted" role="status">
          Cargando el justificante…
        </p>
      </main>
    )
  }

  if (paymentQuery.isError) {
    return (
      <main className={styles.page}>
        <div className={styles.notFound} role="alert">
          <h1>Justificante no disponible</h1>
          <p className="muted">
            {paymentQuery.error?.message || 'No encontramos este pago o no tienes acceso a él.'}
          </p>
          <Link className="secondary-action" to="/pagos">
            Volver a Pagos
          </Link>
        </div>
      </main>
    )
  }

  const payment = paymentQuery.data
  const billingProfile = billingQuery.data || null
  const uid = user?.id

  const isRequester = payment.requester_profile_id === uid
  const isHelper = payment.helper_profile_id === uid

  if (!isRequester && !isHelper) {
    // Defensa extra: la RLS ya impide llegar aquí sin ser participante.
    return (
      <main className={styles.page}>
        <div className={styles.notFound} role="alert">
          <h1>Justificante no disponible</h1>
          <p className="muted">Este pago no pertenece a tu cuenta.</p>
          <Link className="secondary-action" to="/pagos">
            Volver a Pagos
          </Link>
        </div>
      </main>
    )
  }

  const perspective = isRequester ? 'gasto' : 'cobro'
  const docTitle = isRequester ? 'Justificante de pago' : 'Justificante de cobro'
  const receiptNumber = buildReceiptNumber(payment, billingProfile)
  const { label: statusLabel } = getStatusInfo(payment.status, perspective)

  const amountLines = isRequester
    ? [{ label: 'Total pagado', value: payment.amount_cents, total: true }]
    : [
        { label: 'Importe de la tarea', value: payment.amount_cents },
        { label: 'Comisión de plataforma', value: payment.platform_fee_cents },
        { label: 'Total cobrado', value: payment.helper_amount_cents, total: true },
      ]

  return (
    <main className={styles.page}>
      <div className={`${styles.actions} ${styles.noPrint}`}>
        <button type="button" className="secondary-action" onClick={() => window.print()}>
          Imprimir o guardar PDF
        </button>
        <Link className="secondary-action" to="/pagos">
          Volver a Pagos
        </Link>
      </div>

      <article className={styles.document} aria-label={docTitle}>
        <header className={styles.docHeader}>
          <div>
            <p className={styles.brand}>HelpMe · Justificante</p>
            <h1 className={styles.docTitle}>{docTitle}</h1>
          </div>
          <div className={styles.docMeta}>
            <p className={styles.receiptNumber}>{receiptNumber}</p>
            <p className={styles.docDate}>{formatDate(payment.created_at)}</p>
          </div>
        </header>

        <section className={styles.block} aria-label="Datos fiscales">
          <h2 className={styles.blockTitle}>{isRequester ? 'Pagador' : 'Beneficiario'}</h2>
          {hasBillingData(billingProfile) ? (
            <div className={styles.fiscalData}>
              {billingProfile.legal_name ? <p className={styles.fiscalName}>{billingProfile.legal_name}</p> : null}
              {billingProfile.tax_id ? <p>NIF/CIF: {billingProfile.tax_id}</p> : null}
              {billingProfile.address_line ? <p>{billingProfile.address_line}</p> : null}
              {billingProfile.postal_code || billingProfile.city ? (
                <p>{[billingProfile.postal_code, billingProfile.city].filter(Boolean).join(' ')}</p>
              ) : null}
              {billingProfile.country ? <p>{billingProfile.country}</p> : null}
            </div>
          ) : (
            <p className={styles.fiscalWarning}>
              No has completado tus datos de facturación.{' '}
              <Link className={styles.inlineLink} to="/pagos">
                Complétalos en Pagos
              </Link>{' '}
              para que aparezcan en tus justificantes.
            </p>
          )}
        </section>

        <section className={styles.block} aria-label="Detalle del pago">
          <h2 className={styles.blockTitle}>Detalle</h2>
          <dl className={styles.detailList}>
            <div className={styles.detailRow}>
              <dt>Tarea</dt>
              <dd>{payment.tasks?.title ?? 'Tarea'}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Fecha del pago</dt>
              <dd>{formatDate(payment.created_at)}</dd>
            </div>
            <div className={styles.detailRow}>
              <dt>Estado</dt>
              <dd>{statusLabel}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.block} aria-label="Importes">
          <h2 className={styles.blockTitle}>Importes</h2>
          <dl className={styles.detailList}>
            {amountLines.map((line) => (
              <div
                key={line.label}
                className={`${styles.detailRow} ${line.total ? styles.totalRow : ''}`}
              >
                <dt>{line.label}</dt>
                <dd>{formatCents(line.value)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <footer className={styles.docFooter}>
          <p>Documento informativo generado por HelpMe. No sustituye a una factura fiscal.</p>
        </footer>
      </article>
    </main>
  )
}
