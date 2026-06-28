export const TIME_SLOT_OPTIONS = [
  { value: 'flexible', label: 'Flexible', shortLabel: 'Flexible' },
  { value: 'morning', label: 'Mañana', shortLabel: 'Mañana' },
  { value: 'midday', label: 'Mediodía', shortLabel: 'Mediodía' },
  { value: 'afternoon', label: 'Tarde', shortLabel: 'Tarde' },
  { value: 'evening', label: 'Noche', shortLabel: 'Noche' },
]

export const AVAILABILITY_RESPONSE_OPTIONS = [
  { value: 'matches', label: 'Me va bien' },
  { value: 'alternative', label: 'Propongo otra opción' },
]

export const FALLBACK_AVAILABILITY_LABEL = 'Horario flexible'

const TIME_SLOT_LABELS = Object.fromEntries(TIME_SLOT_OPTIONS.map((option) => [option.value, option.label]))
const TIME_SLOT_SHORT_LABELS = Object.fromEntries(
  TIME_SLOT_OPTIONS.map((option) => [option.value, option.shortLabel]),
)
const AVAILABILITY_RESPONSE_LABELS = Object.fromEntries(
  AVAILABILITY_RESPONSE_OPTIONS.map((option) => [option.value, option.label]),
)

export function isValidTimeSlot(value) {
  return TIME_SLOT_OPTIONS.some((option) => option.value === value)
}

export function isValidAvailabilityResponse(value) {
  return AVAILABILITY_RESPONSE_OPTIONS.some((option) => option.value === value)
}

export function normalizeDateInput(value) {
  const cleanValue = String(value || '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) return null

  const date = new Date(`${cleanValue}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : cleanValue
}

export function normalizeTimeSlot(value) {
  const cleanValue = String(value || '').trim()
  return isValidTimeSlot(cleanValue) ? cleanValue : null
}

export function normalizeAvailabilityResponse(value) {
  const cleanValue = String(value || '').trim()
  return isValidAvailabilityResponse(cleanValue) ? cleanValue : null
}

export function getTimeSlotLabel(value, { short = false } = {}) {
  if (!value) return ''
  return short ? TIME_SLOT_SHORT_LABELS[value] || '' : TIME_SLOT_LABELS[value] || ''
}

export function getAvailabilityResponseLabel(value) {
  return AVAILABILITY_RESPONSE_LABELS[value] || ''
}

export function formatAvailabilityDate(value, { short = false } = {}) {
  const cleanValue = normalizeDateInput(value)
  if (!cleanValue) return ''

  const date = new Date(`${cleanValue}T00:00:00`)
  return new Intl.DateTimeFormat('es-ES', short
    ? { day: '2-digit', month: 'short' }
    : { weekday: 'short', day: '2-digit', month: 'short' }).format(date)
}

export function formatTaskAvailabilityShort(task) {
  const dateLabel = formatAvailabilityDate(task?.requested_date, { short: true })
  const slotLabel = getTimeSlotLabel(task?.requested_time_slot, { short: true })
  const parts = [dateLabel, slotLabel].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : FALLBACK_AVAILABILITY_LABEL
}

export function formatTaskAvailabilityFull(task) {
  const baseLabel = formatTaskAvailabilityShort(task)
  const note = String(task?.requested_time_note || '').trim()

  return note ? `${baseLabel} · ${note}` : baseLabel
}

export function formatApplicationAvailability(application, task) {
  const response = normalizeAvailabilityResponse(application?.availability_response)

  if (response === 'matches') {
    return task?.requested_date || task?.requested_time_slot || task?.requested_time_note
      ? 'Le encaja tu horario'
      : 'Horario flexible'
  }

  if (response === 'alternative') {
    const dateLabel = formatAvailabilityDate(application?.proposed_date, { short: true })
    const slotLabel = getTimeSlotLabel(application?.proposed_time_slot, { short: true })
    const note = String(application?.proposed_time_note || '').trim()
    const parts = [dateLabel, slotLabel, note].filter(Boolean)

    return parts.length > 0 ? `Propone: ${parts.join(' · ')}` : 'Propone otra opción'
  }

  return ''
}

export function normalizeTaskAvailabilityInput(input = {}) {
  return {
    requested_date: normalizeDateInput(input.requested_date ?? input.requestedDate),
    requested_time_slot: normalizeTimeSlot(input.requested_time_slot ?? input.requestedTimeSlot),
    requested_time_note: String(input.requested_time_note ?? input.requestedTimeNote ?? '').trim() || null,
  }
}

export function normalizeApplicationAvailabilityInput(input = {}) {
  const response = normalizeAvailabilityResponse(input.availability_response ?? input.availabilityResponse)
  const shouldSendAlternative = response === 'alternative'

  return {
    availability_response: response,
    proposed_date: shouldSendAlternative
      ? normalizeDateInput(input.proposed_date ?? input.proposedDate)
      : null,
    proposed_time_slot: shouldSendAlternative
      ? normalizeTimeSlot(input.proposed_time_slot ?? input.proposedTimeSlot)
      : null,
    proposed_time_note: shouldSendAlternative
      ? String(input.proposed_time_note ?? input.proposedTimeNote ?? '').trim() || null
      : null,
  }
}
