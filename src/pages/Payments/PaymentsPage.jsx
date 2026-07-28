import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDownRight, ArrowUpRight, BarChart3, CreditCard, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import Modal, { ModalBody, ModalHeader } from '../../shared/ui/Modal/Modal'
import { getMyPayments } from '../../services/paymentsService'
import { getMyBillingProfile, saveMyBillingProfile } from '../../services/billingProfileService'
import { readHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { formatEuro } from '../../lib/currency'
import {
  getPaymentDisplayInfo,
  getPaymentSummaryBucket,
  hasReceipt,
  isHelperStarted,
  PAYMENT_SUMMARY_BUCKET,
} from './paymentStatus'
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

function StatusPill({ payment, perspective }) {
  const { tone, label } = getPaymentDisplayInfo(payment, perspective)
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
                <StatusPill payment={payment} perspective={perspective} />
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
// Vive en un modal que abre el usuario (no colgado al final de la página): la
// consulta solo se dispara al abrirlo, y el fondo no cierra para no perder el
// formulario a medio rellenar.
function BillingProfileModal({ open, onClose, userId }) {
  const profileQuery = useQuery({
    queryKey: ['my-billing-profile', userId],
    queryFn: ({ signal }) => getMyBillingProfile({ signal }),
    enabled: open && Boolean(userId),
    staleTime: 30_000,
  })

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel="Datos de facturación" closeOnBackdrop={false}>
      <ModalHeader eyebrow="Facturación" title="Datos de facturación">
        <p className="muted">Nombre fiscal, NIF y dirección para tus justificantes.</p>
      </ModalHeader>
      <ModalBody>
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
      </ModalBody>
    </Modal>
  )
}

// Panel del solicitante (Gastos): lo pagado y lo retenido ahora, tarea a tarea.
// `tabbed` es false cuando no eres helper: entonces no hay tablist y el panel se
// renderiza como sección normal (sin role de pestaña ni referencia colgante).
function ExpensePanel({ released, inTransit, held, review, expenses, tabbed }) {
  const tabProps = tabbed
    ? { id: 'panel-gastos', role: 'tabpanel', 'aria-labelledby': 'tab-gastos' }
    : { 'aria-label': 'Gastos' }

  return (
    <section {...tabProps} className={styles.panel}>
      <div className={styles.summaryGrid} aria-label="Resumen de gastos">
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Liberado</p>
          <p className={styles.tileValue}>{formatCents(released)}</p>
          <p className={styles.tileMeta}>Ya enviado a la cuenta de cobros del helper.</p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>En proceso</p>
          <p className={styles.tileValue}>{formatCents(inTransit)}</p>
          <p className={styles.tileMeta}>La liberación ya se ha iniciado.</p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Retenido en curso</p>
          <p className={styles.tileValue}>{formatCents(held)}</p>
          <p className={styles.tileMeta}>
            HelpMe lo guarda y solo lo libera al helper cuando confirmas que la tarea está hecha.
          </p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Requiere revisión</p>
          <p className={styles.tileValue}>{formatCents(review)}</p>
          <p className={styles.tileMeta}>La tarea terminó, pero el pago todavía no se ha liberado.</p>
        </article>
      </div>

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
    </section>
  )
}

// Panel del helper (Cobros): separa lo ya cobrado de lo pendiente de liberar
// (el dinero retenido a tu favor), que antes no se mostraba en ninguna cifra.
// Incluye el acceso a la configuración de cobros de Stripe, propia de este rol.
function EarningPanel({ earned, inTransit, held, review, earnings, onGoToStripe }) {
  return (
    <section id="panel-cobros" role="tabpanel" aria-labelledby="tab-cobros" className={styles.panel}>
      <div className={styles.summaryGrid} aria-label="Resumen de cobros">
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Cobrado</p>
          <p className={styles.tileValue}>{formatCents(earned)}</p>
          <p className={styles.tileMeta}>Ya liberado a tu cuenta de cobros.</p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>En camino</p>
          <p className={styles.tileValue}>{formatCents(inTransit)}</p>
          <p className={styles.tileMeta}>La liberación hacia tu cuenta de cobros ya se ha iniciado.</p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Retenido en curso</p>
          <p className={styles.tileValue}>{formatCents(held)}</p>
          <p className={styles.tileMeta}>Reservado para tareas que todavía no han finalizado.</p>
        </article>
        <article className={styles.tile}>
          <p className={styles.tileLabel}>Requiere revisión</p>
          <p className={styles.tileValue}>{formatCents(review)}</p>
          <p className={styles.tileMeta}>La tarea terminó, pero este cobro todavía no se ha liberado.</p>
        </article>
      </div>

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

      <section className={styles.card} aria-labelledby="payments-stripe-title">
        <header className={styles.cardHead}>
          <span className={styles.cardIcon} aria-hidden="true">
            <CreditCard size={20} />
          </span>
          <div>
            <h2 id="payments-stripe-title">Cobros con Stripe</h2>
            <p className="muted">Conecta o revisa tu cuenta de cobros de Stripe desde Ajustes.</p>
          </div>
        </header>
        <div className={styles.splitRow}>
          <button type="button" className="secondary-action" onClick={onGoToStripe}>
            Ir a Ajustes
          </button>
        </div>
      </section>
    </section>
  )
}

// Pestaña inicial según el home de origen: se abre en Cobros si vienes del modo
// "Ayudar" y en Gastos si vienes de "Necesito ayuda". El origen llega por
// navigation state (state.from) y, si no, por la intención persistida del home;
// como último recurso, el rol del perfil. Si el resultado es Cobros pero no eres
// helper (pestaña oculta), cae en Gastos.
function resolveInitialTab({ fromState, helperStarted, helperActive }) {
  const resolvedMode = fromState || readHelperHomeIntent() || (helperActive ? 'help' : 'need')
  const wanted = resolvedMode === 'help' ? 'cobros' : 'gastos'
  return helperStarted && wanted === 'cobros' ? 'cobros' : 'gastos'
}

// /pagos — Seguimiento real de gastos (como solicitante) y cobros (como
// helper), con el pago retenido siempre visible. Sustituye conceptualmente a
// la maqueta de /facturacion, pero es una página independiente: aquí no hay
// planes ni suscripción, solo el dinero que se mueve por tareas.
export default function PaymentsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  // La pestaña de Cobros solo existe si el perfil de ayudante está iniciado;
  // si no, /pagos es una sola vista de Gastos sin selector.
  const helperStarted = isHelperStarted(profile)

  const paymentsQuery = useQuery({
    queryKey: ['my-payments', user?.id],
    queryFn: ({ signal }) => getMyPayments({ signal }),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
  })

  const userId = paymentsQuery.data?.userId || user?.id

  const {
    expenseReleased,
    expenseInTransit,
    expenseHeld,
    expenseReview,
    earningReleased,
    earningInTransit,
    earningHeld,
    earningReview,
    expenses,
    earnings,
  } = useMemo(() => {
    const allPayments = paymentsQuery.data?.payments || []
    const expenseTotals = {
      [PAYMENT_SUMMARY_BUCKET.RELEASED]: 0,
      [PAYMENT_SUMMARY_BUCKET.IN_TRANSIT]: 0,
      [PAYMENT_SUMMARY_BUCKET.HELD]: 0,
      [PAYMENT_SUMMARY_BUCKET.REVIEW]: 0,
    }
    const earningTotals = { ...expenseTotals }
    const expenseRows = []
    const earningRows = []

    for (const payment of allPayments) {
      const isRequester = payment.requester_profile_id === userId
      const isHelper = payment.helper_profile_id === userId
      const bucket = getPaymentSummaryBucket(payment)

      if (isRequester) {
        expenseRows.push(payment)
        if (bucket) {
          expenseTotals[bucket] += Number(payment.amount_cents) || 0
        }
      }

      if (isHelper) {
        earningRows.push(payment)
        if (bucket) {
          earningTotals[bucket] += Number(payment.helper_amount_cents) || 0
        }
      }
    }

    return {
      expenseReleased: expenseTotals[PAYMENT_SUMMARY_BUCKET.RELEASED],
      expenseInTransit: expenseTotals[PAYMENT_SUMMARY_BUCKET.IN_TRANSIT],
      expenseHeld: expenseTotals[PAYMENT_SUMMARY_BUCKET.HELD],
      expenseReview: expenseTotals[PAYMENT_SUMMARY_BUCKET.REVIEW],
      earningReleased: earningTotals[PAYMENT_SUMMARY_BUCKET.RELEASED],
      earningInTransit: earningTotals[PAYMENT_SUMMARY_BUCKET.IN_TRANSIT],
      earningHeld: earningTotals[PAYMENT_SUMMARY_BUCKET.HELD],
      earningReview: earningTotals[PAYMENT_SUMMARY_BUCKET.REVIEW],
      expenses: expenseRows,
      earnings: earningRows,
    }
  }, [paymentsQuery.data, userId])

  // Pestaña resuelta por origen; el clic del usuario (userTab) manda a partir
  // de ahí. Sin efectos: la elección explícita se superpone a la inicial.
  const initialTab = resolveInitialTab({
    fromState: location.state?.from,
    helperStarted,
    helperActive: profile?.helper_status === 'active',
  })
  const [userTab, setUserTab] = useState(null)
  const [billingOpen, setBillingOpen] = useState(false)
  const activeTab = helperStarted ? userTab ?? initialTab : 'gastos'

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <p className="eyebrow">Tu actividad</p>
          <h1>Pagos</h1>
          <p className={styles.pageLead}>
            Seguimiento de tus gastos y cobros por tarea. El pago queda retenido en HelpMe y solo se
            libera al helper cuando el solicitante confirma que la tarea está hecha.
          </p>
        </div>
        <button type="button" className={`secondary-action ${styles.billingTrigger}`} onClick={() => setBillingOpen(true)}>
          <FileText size={18} aria-hidden="true" />
          Datos de facturación
        </button>
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
          {helperStarted ? (
            <div className={styles.tabs} role="tablist" aria-label="Tipo de panel">
              <button
                type="button"
                role="tab"
                id="tab-gastos"
                aria-selected={activeTab === 'gastos'}
                aria-controls="panel-gastos"
                className={`${styles.tab} ${activeTab === 'gastos' ? styles.tabActive : ''}`.trim()}
                onClick={() => setUserTab('gastos')}
              >
                Gastos
              </button>
              <button
                type="button"
                role="tab"
                id="tab-cobros"
                aria-selected={activeTab === 'cobros'}
                aria-controls="panel-cobros"
                className={`${styles.tab} ${activeTab === 'cobros' ? styles.tabActive : ''}`.trim()}
                onClick={() => setUserTab('cobros')}
              >
                Cobros
              </button>
            </div>
          ) : null}

          {activeTab === 'cobros' ? (
            <EarningPanel
              earned={earningReleased}
              inTransit={earningInTransit}
              held={earningHeld}
              review={earningReview}
              earnings={earnings}
              onGoToStripe={() => navigate('/settings#pagos')}
            />
          ) : (
            <ExpensePanel
              released={expenseReleased}
              inTransit={expenseInTransit}
              held={expenseHeld}
              review={expenseReview}
              expenses={expenses}
              tabbed={helperStarted}
            />
          )}

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
        </div>
      )}

      <BillingProfileModal open={billingOpen} onClose={() => setBillingOpen(false)} userId={userId} />
    </main>
  )
}
