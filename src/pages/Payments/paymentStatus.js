// Mapeo compartido de payments.status → etiqueta es-ES + tono visual, usado
// por /pagos y por el justificante. Los estados se agrupan por lo que
// significan para quien los mira: "en camino" (retenido o moviéndose),
// "cerrado a favor" (liberado/cobrado), "devuelto" o "incidencia". Un mismo
// status puede leerse distinto como gasto o cobro (released es "Liberado"
// para quien paga, "Cobrado" para quien ayuda).
export const STATUS_META = {
  held: { tone: 'warning', gasto: 'Retenido', cobro: 'Retenido' },
  captured: { tone: 'warning', gasto: 'Retenido', cobro: 'Retenido' },
  processing: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  pending: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  requires_action: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  requires_checkout: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  transferring: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  release_pending: { tone: 'warning', gasto: 'En proceso', cobro: 'En proceso' },
  released: { tone: 'success', gasto: 'Liberado', cobro: 'Cobrado' },
  succeeded: { tone: 'success', gasto: 'Liberado', cobro: 'Cobrado' },
  refunded: { tone: 'neutral', gasto: 'Devuelto', cobro: 'Devuelto' },
  refunding: { tone: 'neutral', gasto: 'Devuelto', cobro: 'Devuelto' },
  failed: { tone: 'danger', gasto: 'Incidencia', cobro: 'Incidencia' },
  disputed: { tone: 'danger', gasto: 'Incidencia', cobro: 'Incidencia' },
  voided: { tone: 'danger', gasto: 'Incidencia', cobro: 'Incidencia' },
  draft: { tone: 'neutral', gasto: 'Borrador', cobro: 'Borrador' },
}

/** Etiqueta + tono para un status según la perspectiva ('gasto' | 'cobro'). */
export function getStatusInfo(status, perspective) {
  const meta = STATUS_META[status]
  if (!meta) {
    return { tone: 'neutral', label: status || 'Pendiente' }
  }
  return { tone: meta.tone, label: meta[perspective] }
}

export const PAYMENT_SUMMARY_BUCKET = Object.freeze({
  RELEASED: 'released',
  IN_TRANSIT: 'in_transit',
  HELD: 'held',
  REVIEW: 'review',
})

const RELEASED_PAYMENT_STATUSES = new Set(['released', 'succeeded'])
const RELEASE_IN_TRANSIT_STATUSES = new Set(['release_pending', 'transferring'])
const HELD_PAYMENT_STATUSES = new Set(['held', 'captured'])
const COMPLETED_TASK_STATUSES = new Set(['completed', 'closed'])
const REVIEW_RECONCILIATION_STATUSES = new Set(['mismatch', 'needs_review'])

function getTaskStatus(payment) {
  return payment?.tasks?.status || null
}

/** Una incidencia de liberación, no un pago fallido antes de quedar retenido. */
export function needsPaymentReview(payment) {
  const status = payment?.status

  if (
    !HELD_PAYMENT_STATUSES.has(status) &&
    !RELEASE_IN_TRANSIT_STATUSES.has(status)
  ) {
    return false
  }

  if (REVIEW_RECONCILIATION_STATUSES.has(payment?.reconciliation_status)) {
    return true
  }

  return HELD_PAYMENT_STATUSES.has(status) && COMPLETED_TASK_STATUSES.has(getTaskStatus(payment))
}

/**
 * Clasificación compartida por los resúmenes de requester y helper. Los estados
 * previos al cobro (draft/processing/requires_checkout) no suman dinero retenido.
 */
export function getPaymentSummaryBucket(payment) {
  if (RELEASED_PAYMENT_STATUSES.has(payment?.status)) {
    return PAYMENT_SUMMARY_BUCKET.RELEASED
  }

  if (needsPaymentReview(payment)) {
    return PAYMENT_SUMMARY_BUCKET.REVIEW
  }

  if (RELEASE_IN_TRANSIT_STATUSES.has(payment?.status)) {
    return PAYMENT_SUMMARY_BUCKET.IN_TRANSIT
  }

  if (HELD_PAYMENT_STATUSES.has(payment?.status)) {
    return PAYMENT_SUMMARY_BUCKET.HELD
  }

  return null
}

export function getPaymentDisplayInfo(payment, perspective) {
  const bucket = getPaymentSummaryBucket(payment)

  if (bucket === PAYMENT_SUMMARY_BUCKET.REVIEW) {
    return { tone: 'danger', label: 'Requiere revisión' }
  }

  if (bucket === PAYMENT_SUMMARY_BUCKET.IN_TRANSIT) {
    return {
      tone: 'warning',
      label: perspective === 'cobro' ? 'En camino' : 'Liberando',
    }
  }

  return getStatusInfo(payment?.status, perspective)
}

/** Como helper: dinero ya cobrado (liberado y a tu favor). */
export const EARNED_STATUSES = new Set(['released', 'succeeded'])

/** Como helper: dinero pendiente de liberar (retenido o en proceso a tu favor).
 * Se deriva del tono 'warning' de STATUS_META (retenido/en proceso), así que un
 * estado nuevo con ese tono entra aquí sin tocar esta lista. Excluye devuelto
 * (el dinero vuelve al solicitante) e incidencia (no hay cobro). */
export const EARNING_PENDING_STATUSES = new Set(
  Object.entries(STATUS_META)
    .filter(([, meta]) => meta.tone === 'warning')
    .map(([status]) => status),
)

/** Estados con justificante disponible: el dinero ya llegó a su destino final. */
export const RECEIPT_STATUSES = new Set(['released', 'succeeded', 'refunded'])

/** Como solicitante: dinero ya gastado (liberado o en camino al helper). */
export const SPENT_STATUSES = new Set(['released', 'transferring', 'release_pending'])

/** Como solicitante: dinero retenido ahora (aún no liberado ni devuelto). */
export const HELD_STATUSES = new Set(['held', 'captured', 'processing'])

/** Gastado ∪ retenido: todo el dinero comprometido como solicitante. */
export const COMMITTED_STATUSES = new Set([...SPENT_STATUSES, ...HELD_STATUSES])

export function hasReceipt(status) {
  return RECEIPT_STATUSES.has(status)
}

/**
 * "Ser helper" a efectos de /pagos y Ajustes: el perfil de ayudante está al
 * menos iniciado. Fuente única compartida con PaymentsSettings para que la
 * pestaña de Cobros y el estado de Stripe no se contradigan. Aún sin Stripe
 * configurado sigue siendo helper (verá su panel de cobros; el estado de la
 * cuenta se resuelve dentro).
 */
export function isHelperStarted(profile) {
  return Boolean(
    profile?.helper_enabled || (profile?.helper_status && profile.helper_status !== 'not_started'),
  )
}
