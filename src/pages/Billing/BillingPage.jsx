import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Receipt, Sparkles } from 'lucide-react'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../shared/ui/Modal/Modal'
import { BILLING_CYCLES, getPlanById, MOCK_BILLING } from '../../config/subscriptionPlans'
import { formatEuro } from '../../lib/currency'
import styles from './Billing.module.css'

const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric' }

// /facturacion — Estado de la cuenta (maqueta). Plan, pago, facturas y
// cancelación son datos de ejemplo: aquí no se lee ni escribe nada real.
export default function BillingPage() {
  const navigate = useNavigate()
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelRequested, setCancelRequested] = useState(false)

  const plan = getPlanById(MOCK_BILLING.planId)
  const cycle = BILLING_CYCLES[MOCK_BILLING.cycle]

  const renewalDate = useMemo(() => {
    const date = new Date()
    date.setMonth(date.getMonth() + (cycle.id === 'anual' ? 12 : 1))
    return date.toLocaleDateString('es-ES', DATE_FORMAT)
  }, [cycle.id])

  // Últimos 3 recibos de ejemplo, uno por mes hacia atrás.
  const invoices = useMemo(() => {
    return Array.from({ length: 3 }, (_, index) => {
      const date = new Date()
      date.setMonth(date.getMonth() - index)
      return {
        id: `mock-${index}`,
        dateLabel: date.toLocaleDateString('es-ES', DATE_FORMAT),
        total: plan.prices[cycle.id],
        status: 'Pagada',
      }
    })
  }, [cycle.id, plan])

  function handleConfirmCancel() {
    setCancelModalOpen(false)
    setCancelRequested(true)
  }

  return (
    <main className={`${styles.page} ${styles.pageNarrow}`}>
      <header className={styles.pageHeader}>
        <p className="eyebrow">Tu cuenta</p>
        <h1>Facturación</h1>
        <p className={styles.pageLead}>Tu plan, tu método de pago y tus recibos, en un solo sitio.</p>
      </header>

      <div className={styles.stack}>
        <section className={styles.card} aria-labelledby="billing-plan-title">
          <header className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden="true">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 id="billing-plan-title">Plan actual</h2>
              <p className="muted">Puedes cambiar de plan cuando quieras.</p>
            </div>
          </header>
          <div className={styles.splitRow}>
            <div>
              <p className={styles.planTitle}>
                {plan.name} <span className={styles.pill}>{cycle.label}</span>
              </p>
              <p className={styles.rowNote}>Tu suscripción se renovará el {renewalDate}.</p>
            </div>
            <button type="button" className="secondary-action" onClick={() => navigate('/planes')}>
              Cambiar de plan
            </button>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="billing-payment-title">
          <header className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden="true">
              <CreditCard size={20} />
            </span>
            <div>
              <h2 id="billing-payment-title">Pago</h2>
              <p className="muted">Método con el que se renueva tu plan.</p>
            </div>
          </header>
          <div className={styles.splitRow}>
            <div>
              {/* Cadena ya enmascarada de ejemplo: nunca se muestra ni guarda una tarjeta real. */}
              <p className={styles.planTitle}>{MOCK_BILLING.paymentMethodLabel}</p>
              <p className={styles.rowNote}>Dato de ejemplo de la maqueta.</p>
            </div>
            <button
              type="button"
              className="secondary-action"
              onClick={() => navigate(`/pago?plan=${plan.id}&ciclo=${cycle.id}`)}
            >
              Actualizar
            </button>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="billing-invoices-title">
          <header className={styles.cardHead}>
            <span className={styles.cardIcon} aria-hidden="true">
              <Receipt size={20} />
            </span>
            <div>
              <h2 id="billing-invoices-title">Facturas</h2>
              <p className="muted">Historial de recibos (datos de ejemplo).</p>
            </div>
          </header>
          <div className={styles.tableScroll}>
            <table className={styles.invoiceTable}>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Total</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>{invoice.dateLabel}</td>
                    <td>{formatEuro(invoice.total)}</td>
                    <td>
                      <span className={styles.statusPill}>{invoice.status}</span>
                    </td>
                    <td>
                      {/* Maqueta: aún no hay PDF real que abrir. */}
                      <button type="button" className={styles.tableLink}>
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`${styles.card} ${styles.dangerCard}`} aria-labelledby="billing-cancel-title">
          <div className={styles.splitRow}>
            <div>
              <h2 id="billing-cancel-title" className={styles.planTitle}>
                Cancelar plan
              </h2>
              <p className={styles.rowNote}>
                Mantendrías lo incluido en tu plan hasta el final del ciclo ya pagado.
              </p>
            </div>
            <button type="button" className="danger-action" onClick={() => setCancelModalOpen(true)}>
              Cancelar plan
            </button>
          </div>
          {cancelRequested ? (
            <p className={styles.feedback} role="status">
              Maqueta: hemos registrado tu intención de cancelar, pero no se ha cambiado nada.
            </p>
          ) : null}
        </section>
      </div>

      {/* Diálogo de confirmación mock: no cancela ni borra nada. */}
      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} size="sm">
        <ModalHeader eyebrow="Cancelar plan" title={`¿Cancelar ${plan.name}?`} />
        <ModalBody>
          <p>
            Perderías las ventajas de {plan.name} al terminar el ciclo actual. Esta pantalla es una
            maqueta: confirmar no cancela nada de verdad.
          </p>
        </ModalBody>
        <ModalActions>
          <button type="button" className="secondary-action" onClick={() => setCancelModalOpen(false)}>
            Mantener mi plan
          </button>
          <button type="button" className="danger-action" onClick={handleConfirmCancel}>
            Cancelar plan
          </button>
        </ModalActions>
      </Modal>
    </main>
  )
}
