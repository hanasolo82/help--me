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
