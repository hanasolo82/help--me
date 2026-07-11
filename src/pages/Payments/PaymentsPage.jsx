import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, BarChart3, CreditCard, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { getMyPayments } from '../../services/paymentsService'
import { getMyBillingProfile, saveMyBillingProfile } from '../../services/billingProfileService'
import { formatEuro } from '../../lib/currency'
import { getStatusInfo, hasReceipt, HELD_STATUSES, SPENT_STATUSES } from './paymentStatus'
import ActivityChart from './ActivityChart'
import styles from './Payments.module.css'

const DATE_FORMAT = { day: '2-digit', month: 'short', year: 'numeric' }

const EMPTY_BILLING_FORM = {
  legal_name: '',
  tax_id: '',
  address_line: '',
  postal_code: '',
  city: '',
  country: 'ES',
  invoice_prefix: 'HM',
}

const BILLING_FIELDS = [
  { key: 'legal_name', label: 'Nombre o razón social', autoComplete: 'name' },
  { key: 'tax_id', label: 'NIF/CIF', autoComplete: 'off' },
  { key: 'address_line', label: 'Dirección', autoComplete: 'street-address' },
  { key: 'postal_code', label: 'Código postal', autoComplete: 'postal-code' },
  { key: 'city', label: 'Ciudad', autoComplete: 'address-level2' },
  { key: 'country', label: 'País', autoComplete: 'country-name' },
  { key: 'invoice_prefix', label: 'Prefijo de justificante', autoComplete: 'off' },
]

/** Cifras en céntimos (amount_cents, helper_amount_cents) a "12,34 €". */
function formatCents(cents) {
  return formatEuro((Number(cents) || 0) / 100)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-ES', DATE_FORMAT)
}

function StatusPill({ status, perspective }) {
  const { tone, label } = getStatusInfo(status, perspective)
  const toneClass = {
    warning: styles.pillWarning,
    success: styles.pillSuccess,
    neutral: styles.pillNeutral,
    danger: styles.pillDanger,
  }[tone]

  return <span className={`${styles.pill} ${toneClass}`}>{label}</span>
}

function PaymentsTable({ rows, perspective, emptyMessage }) {
  if (rows.length === 0) {
    return <p className={`muted ${styles.emptyNote}`}>{emptyMessage}</p>
  }

  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Tarea</th>
            <th scope="col">Estado</th>
            <th scope="col">Importe</th>
            <th scope="col">Justificante</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((payment) => (
            <tr key={payment.id}>
              <td>{formatDate(payment.created_at)}</td>
              <td>{payment.tasks?.title ?? 'Tarea'}</td>
              <td>
                <StatusPill status={payment.status} perspective={perspective} />
              </td>
              <td className={styles.amountCell}>
                {formatCents(perspective === 'gasto' ? payment.amount_cents : payment.helper_amount_cents)}
              </td>
              <td>
                {hasReceipt(payment.status) ? (
                  <Link className={styles.receiptLink} to={`/pagos/justificante/${payment.id}`}>
                    Ver
                  </Link>
                ) : (
                  <span aria-hidden="true">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Formulario interno: se monta cuando ya hay respuesta (fila o null), así el
// estado inicial sale del useState y no hace falta sincronizar con un efecto.
function BillingProfileForm({ initialProfile }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(() =>
    initialProfile
      ? {
          legal_name: initialProfile.legal_name ?? '',
          tax_id: initialProfile.tax_id ?? '',
          address_line: initialProfile.address_line ?? '',
          postal_code: initialProfile.postal_code ?? '',
          city: initialProfile.city ?? '',
          country: initialProfile.country ?? 'ES',
          invoice_prefix: initialProfile.invoice_prefix ?? 'HM',
        }
      : EMPTY_BILLING_FORM,
  )
  const [saved, setSaved] = useState(false)

  const saveMutation = useMutation({
    mutationFn: (values) => saveMyBillingProfile(values),
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['my-billing-profile'] })
    },
  })

  function handleChange(key, value) {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    saveMutation.mutate(form)
  }

  const isSaving = saveMutation.isPending

  return (
    <form className={styles.billingForm} onSubmit={handleSubmit}>
      <div className={styles.fieldGrid}>
        {BILLING_FIELDS.map((field) => (
          <div key={field.key} className={`field ${styles.field}`}>
            <label className={styles.fieldLabel} htmlFor={`billing-${field.key}`}>
              {field.label}
            </label>
            <input
              id={`billing-${field.key}`}
              type="text"
              value={form[field.key]}
              autoComplete={field.autoComplete}
              disabled={isSaving}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className={styles.formFooter}>
        <button type="submit" className="secondary-action" disabled={isSaving}>
          {isSaving ? 'Guardando…' : 'Guardar datos'}
        </button>
        {saved ? (
          <span className={styles.formSaved} role="status">
            Guardado
          </span>
        ) : null}
        {saveMutation.isError ? (
          <span className={styles.formError} role="alert">
            {saveMutation.error?.message || 'No pudimos guardar tus datos.'}
          </span>
        ) : null}
      </div>

      <p className={`muted ${styles.formNote}`}>
        Estos datos aparecen en tus justificantes de pago y cobro.
      </p>
    </form>
  )
}

// Datos fiscales que encabezan los justificantes. Se guardan en
// billing_profiles (una fila por usuario, RLS solo del propio usuario).
function BillingProfileCard({ userId }) {
  const profileQuery = useQuery({
    queryKey: ['my-billing-profile', userId],
    queryFn: ({ signal }) => getMyBillingProfile({ signal }),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  return (
    <section className={styles.card} aria-labelledby="payments-billing-title">
      <header className={styles.cardHead}>
        <span className={styles.cardIcon} aria-hidden="true">
          <FileText size={20} />
        </span>
        <div>
          <h2 id="payments-billing-title">Datos de facturación</h2>
          <p className="muted">Nombre fiscal, NIF y dirección para tus justificantes.</p>
        </div>
      </header>

      {profileQuery.isPending ? (
        <p className="muted" role="status">
          Cargando tus datos de facturación…
        </p>
      ) : profileQuery.isError ? (
        <p className={styles.formError} role="alert">
          {profileQuery.error?.message || 'No pudimos cargar tus datos de facturación.'}
        </p>
      ) : (
        <BillingProfileForm initialProfile={profileQuery.data} />
      )}
    </section>
  )
}

// /pagos — Seguimiento real de gastos (como solicitante) y cobros (como
// helper), con el pago retenido siempre visible. Sustituye conceptualmente a
// la maqueta de /facturacion, pero es una página independiente: aquí no hay
// planes ni suscripción, solo el dinero que se mueve por tareas.
export default function PaymentsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const paymentsQuery = useQuery({
    queryKey: ['my-payments', user?.id],
    queryFn: ({ signal }) => getMyPayments({ signal }),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
  })

  const userId = paymentsQuery.data?.userId || user?.id

  const { spent, heldNow, earned, expenses, earnings } = useMemo(() => {
    const allPayments = paymentsQuery.data?.payments || []
    let spentCents = 0
    let heldCents = 0
    let earnedCents = 0
    const expenseRows = []
    const earningRows = []

    for (const payment of allPayments) {
      const isRequester = payment.requester_profile_id === userId
      const isHelper = payment.helper_profile_id === userId

      if (isRequester) {
        expenseRows.push(payment)
        if (SPENT_STATUSES.has(payment.status)) {
          spentCents += Number(payment.amount_cents) || 0
        } else if (HELD_STATUSES.has(payment.status)) {
          heldCents += Number(payment.amount_cents) || 0
        }
      }

      if (isHelper) {
        earningRows.push(payment)
        if (payment.status === 'released') {
          earnedCents += Number(payment.helper_amount_cents) || 0
        }
      }
    }

    return {
      spent: spentCents,
      heldNow: heldCents,
      earned: earnedCents,
      expenses: expenseRows,
      earnings: earningRows,
    }
  }, [paymentsQuery.data, userId])

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <p className="eyebrow">Tu actividad</p>
        <h1>Pagos</h1>
        <p className={styles.pageLead}>
          Seguimiento de tus gastos y cobros por tarea, con el pago retenido siempre visible.
        </p>
      </header>

      {paymentsQuery.isPending ? (
        <p className="muted" role="status">
          Cargando tus pagos…
        </p>
      ) : paymentsQuery.isError ? (
        <div className={styles.errorCard} role="alert">
          <p>{paymentsQuery.error?.message || 'No pudimos cargar tus pagos.'}</p>
          <button type="button" className="secondary-action" onClick={() => paymentsQuery.refetch()}>
            Reintentar
          </button>
        </div>
      ) : (
        <div className={styles.stack}>
          <section className={styles.summaryGrid} aria-label="Resumen de pagos">
            <article className={styles.tile}>
              <p className={styles.tileLabel}>Gastado</p>
              <p className={styles.tileValue}>{formatCents(spent)}</p>
            </article>
            <article className={styles.tile}>
              <p className={styles.tileLabel}>Retenido ahora</p>
              <p className={styles.tileValue}>{formatCents(heldNow)}</p>
            </article>
            <article className={styles.tile}>
              <p className={styles.tileLabel}>Cobrado</p>
              <p className={styles.tileValue}>{formatCents(earned)}</p>
            </article>
          </section>

          <section className={styles.card} aria-labelledby="payments-activity-title">
            <header className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <BarChart3 size={20} />
              </span>
              <div>
                <h2 id="payments-activity-title">Actividad</h2>
                <p className="muted">Tus gastos y cobros de los últimos 6 meses.</p>
              </div>
            </header>
            <ActivityChart payments={paymentsQuery.data?.payments ?? []} userId={userId} />
          </section>

          <section className={styles.card} aria-labelledby="payments-expenses-title">
            <header className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <ArrowUpRight size={20} />
              </span>
              <div>
                <h2 id="payments-expenses-title">Gastos</h2>
                <p className="muted">Lo que has pagado como solicitante, tarea a tarea.</p>
              </div>
            </header>
            <PaymentsTable
              rows={expenses}
              perspective="gasto"
              emptyMessage="Aún no tienes gastos. Cuando completes una tarea aparecerá aquí."
            />
          </section>

          <section className={styles.card} aria-labelledby="payments-earnings-title">
            <header className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <ArrowDownRight size={20} />
              </span>
              <div>
                <h2 id="payments-earnings-title">Cobros</h2>
                <p className="muted">Lo que has ganado como helper, tarea a tarea.</p>
              </div>
            </header>
            <PaymentsTable
              rows={earnings}
              perspective="cobro"
              emptyMessage="Aún no tienes cobros. Cuando completes una tarea aparecerá aquí."
            />
          </section>

          <BillingProfileCard userId={userId} />

          <section className={styles.card} aria-labelledby="payments-stripe-title">
            <header className={styles.cardHead}>
              <span className={styles.cardIcon} aria-hidden="true">
                <CreditCard size={20} />
              </span>
              <div>
                <h2 id="payments-stripe-title">Cobros con Stripe</h2>
                <p className="muted">La configuración de tu cuenta de cobros (Stripe) vive en Ajustes.</p>
              </div>
            </header>
            <div className={styles.splitRow}>
              <button type="button" className="secondary-action" onClick={() => navigate('/settings#pagos')}>
                Ir a Ajustes
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
