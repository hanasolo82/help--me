import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import { BILLING_CYCLES, getPlanById } from '../../config/subscriptionPlans'
import { formatEuro } from '../../lib/currency'
import styles from './Billing.module.css'

const VAT_RATE = 0.21

// /pago — Checkout SOLO MAQUETA. No hay campos de tarjeta ni integración de
// cobro: el hueco del proveedor queda marcado y "Confirmar" simula el éxito.
export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [confirmed, setConfirmed] = useState(false)
  const redirectTimerRef = useRef(null)

  // Query params con fallback: /pago sin params resume Vecino Plus mensual.
  const plan = getPlanById(searchParams.get('plan')) || getPlanById('plus')
  const cycle = BILLING_CYCLES[searchParams.get('ciclo')] || BILLING_CYCLES.mensual

  const total = plan.prices[cycle.id]
  // Precios con IVA incluido: desglosamos la parte estimada de impuestos.
  const estimatedVat = total - total / (1 + VAT_RATE)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  function handleConfirm() {
    setConfirmed(true)
    redirectTimerRef.current = window.setTimeout(() => {
      navigate('/facturacion')
    }, 1600)
  }

  return (
    <main className={styles.page}>
      <Link className={styles.backLink} to="/planes">
        <ArrowLeft size={16} aria-hidden="true" />
        Volver a planes
      </Link>

      <header className={styles.pageHeader}>
        <p className="eyebrow">Último paso</p>
        <h1>Pago</h1>
        <p className={styles.pageLead}>
          Revisa tu pedido. Esta pantalla es una maqueta: no se realizará ningún cargo.
        </p>
      </header>

      {confirmed ? (
        <section className={`${styles.card} ${styles.successCard}`} role="status">
          <CheckCircle2 size={44} className={styles.successIcon} aria-hidden="true" />
          <h2>Suscripción simulada con éxito</h2>
          <p className="muted">
            {plan.name} · {cycle.label}. Te llevamos de vuelta a Facturación...
          </p>
        </section>
      ) : (
        <div className={styles.checkoutLayout}>
          <section className={styles.card} aria-labelledby="checkout-payment-title">
            <header className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <Lock size={20} />
              </span>
              <div>
                <h2 id="checkout-payment-title">Método de pago</h2>
                <p className="muted">Tus datos de tarjeta nunca pasan por HelpMe.</p>
              </div>
            </header>

            {/* TODO(pagos): aquí se montará el componente seguro del proveedor de
                pagos (p. ej. Stripe Elements / Payment Element). Esta maqueta no
                renderiza campos de tarjeta ni recoge ningún dato financiero. */}
            <div className={styles.providerSlot}>
              <Lock size={22} aria-hidden="true" />
              <strong>Zona del proveedor de pagos</strong>
              <p>
                Los datos de tarjeta se introducirán aquí, dentro del componente del proveedor
                (Stripe). En esta maqueta el hueco queda reservado y vacío.
              </p>
            </div>

            <div className={styles.checkoutActions}>
              <button type="button" className="primary-action" onClick={handleConfirm}>
                Confirmar suscripción
              </button>
              <p className={styles.ctaNote}>Maqueta: al confirmar no se cobra nada.</p>
            </div>
          </section>

          <section
            className={`${styles.card} ${styles.summaryCardMobileFirst}`}
            aria-labelledby="checkout-summary-title"
          >
            <header className={styles.cardHead}>
              <div>
                <h2 id="checkout-summary-title">Resumen del pedido</h2>
                <p className="muted">Podrás cambiar de plan cuando quieras.</p>
              </div>
            </header>
            <dl className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <dt>Plan</dt>
                <dd>{plan.name}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Ciclo</dt>
                <dd>
                  {cycle.label}
                  {cycle.note ? ` · ${cycle.note}` : ''}
                </dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Precio</dt>
                <dd>{formatEuro(total)}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>Impuestos estimados (IVA 21 %, incluidos)</dt>
                <dd>{formatEuro(estimatedVat)}</dd>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                <dt>Total hoy</dt>
                <dd>{formatEuro(total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </main>
  )
}
