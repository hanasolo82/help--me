const TASK_STATUS_LABELS = {
  draft: 'Borrador',
  open: 'Publicada',
  assigned: 'Oferta pendiente',
  in_progress: 'Tarea en curso',
  completed: 'Tarea completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
}

// Fragmentos de copy que las superficies resaltan (acción en acento, positivos en verde).
// Centralizados para que construir el hint y resaltarlo compartan una única fuente:
// si cambia el texto, no hay que tocarlo en cada renderer y el resalte no se rompe en silencio.
export const STATUS_HINT_PHRASES = Object.freeze({
  action: 'Confirma y paga',
  inProgress: 'Chat disponible',
  completed: 'Cierre confirmado',
})

export function getTaskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || 'Estado no disponible'
}

export function getTaskStatusHint({
  status,
  viewerRole = 'viewer',
  applicationCount = 0,
  helperName = '',
  hasReview = false,
} = {}) {
  const count = Number(applicationCount || 0)
  const resolvedHelperName = helperName || 'tu helper'

  if (status === 'draft') return 'Pendiente de publicar.'

  if (status === 'open') {
    if (count === 1) return '1 helper interesado'
    if (count > 1) return `${count} helpers interesados`
    return 'Recibiendo ofertas de helpers.'
  }

  if (status === 'assigned') {
    if (viewerRole === 'requester') {
      return `Has elegido a ${resolvedHelperName}. ${STATUS_HINT_PHRASES.action} para desbloquear el chat.`
    }

    if (viewerRole === 'helper') {
      return 'Esperando a que el solicitante confirme y pague.'
    }

    return 'Pendiente de confirmación y pago.'
  }

  if (status === 'in_progress') {
    return `${STATUS_HINT_PHRASES.inProgress} para coordinar los últimos detalles.`
  }

  if (status === 'completed') {
    if (viewerRole === 'requester' && !hasReview) {
      return `${STATUS_HINT_PHRASES.completed}. Valora a tu helper.`
    }

    return `${STATUS_HINT_PHRASES.completed}.`
  }

  if (status === 'closed') return 'Tarea cerrada.'
  if (status === 'cancelled') return 'Tarea cancelada.'

  return ''
}
