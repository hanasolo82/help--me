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
export const TASK_MINIMUM_LEAD_MINUTES = 30
export const TASK_MINIMUM_DURATION_MINUTES = 30

const TIME_SLOT_LABELS = Object.fromEntries(TIME_SLOT_OPTIONS.map((option) => [option.value, option.label]))
const TIME_SLOT_SHORT_LABELS = Object.fromEntries(
  TIME_SLOT_OPTIONS.map((option) => [option.value, option.shortLabel]),
)
const AVAILABILITY_RESPONSE_LABELS = Object.fromEntries(
  AVAILABILITY_RESPONSE_OPTIONS.map((option) => [option.value, option.label]),
)

function toValidDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getInputValue(input, snakeCase, camelCase) {
  return input?.[snakeCase] ?? input?.[camelCase] ?? null
}

function formatInTaskTimeZone(value, options, timeZone) {
  const date = toValidDate(value)
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat('es-ES', {
      ...options,
      ...(timeZone ? { timeZone } : {}),
    }).format(date)
  } catch {
    return new Intl.DateTimeFormat('es-ES', options).format(date)
  }
}

function toDateTimeLocalValue(value) {
  const date = toValidDate(value)
  if (!date) return ''

  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function roundUpToQuarterHour(date) {
  const rounded = new Date(date)
  rounded.setSeconds(0, 0)

  const remainder = rounded.getMinutes() % 15
  if (remainder) {
    rounded.setMinutes(rounded.getMinutes() + (15 - remainder))
  }

  return rounded
}

function getTaskTimeZone(input) {
  const timeZone = String(input?.timezone || input?.timeZone || '').trim()
  if (timeZone) return timeZone

  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

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

export function normalizeDateTimeInput(value) {
  const cleanValue = String(value || '').trim()
  const date = toValidDate(cleanValue)
  return date ? date.toISOString() : null
}

export function getDefaultTaskTimeWindow(now = new Date()) {
  const startsAt = roundUpToQuarterHour(
    new Date(now.getTime() + (TASK_MINIMUM_LEAD_MINUTES + 30) * 60_000),
  )
  const endsAt = new Date(startsAt.getTime() + 60 * 60_000)

  return {
    startsAt: toDateTimeLocalValue(startsAt),
    endsAt: toDateTimeLocalValue(endsAt),
    timezone: getTaskTimeZone(),
  }
}

export function getTaskTimeWindowFormValues(task, now = new Date()) {
  const defaults = getDefaultTaskTimeWindow(now)

  return {
    startsAt: toDateTimeLocalValue(task?.starts_at ?? task?.startsAt) || defaults.startsAt,
    endsAt: toDateTimeLocalValue(task?.ends_at ?? task?.endsAt) || defaults.endsAt,
    timezone: getTaskTimeZone(task) || defaults.timezone,
  }
}

export function normalizeTaskTimeWindowInput(input = {}) {
  return {
    starts_at: normalizeDateTimeInput(getInputValue(input, 'starts_at', 'startsAt')),
    ends_at: normalizeDateTimeInput(getInputValue(input, 'ends_at', 'endsAt')),
    timezone: getTaskTimeZone(input),
  }
}

export function validateTaskTimeWindow(input = {}, { requireComplete = false, now = new Date() } = {}) {
  const rawStart = getInputValue(input, 'starts_at', 'startsAt')
  const rawEnd = getInputValue(input, 'ends_at', 'endsAt')
  const startsAt = toValidDate(rawStart)
  const endsAt = toValidDate(rawEnd)
  const hasStart = Boolean(String(rawStart || '').trim())
  const hasEnd = Boolean(String(rawEnd || '').trim())
  const errors = []

  if (requireComplete && !hasStart) {
    errors.push('Indica cuándo empieza la tarea.')
  }

  if (requireComplete && !hasEnd) {
    errors.push('Indica cuándo termina la tarea.')
  }

  if (hasStart && !startsAt) {
    errors.push('La hora de inicio no es válida.')
  }

  if (hasEnd && !endsAt) {
    errors.push('La hora de finalización no es válida.')
  }

  if (startsAt && startsAt.getTime() < now.getTime() + TASK_MINIMUM_LEAD_MINUTES * 60_000) {
    errors.push('El inicio debe ser al menos 30 minutos después de ahora.')
  }

  if (startsAt && endsAt) {
    if (endsAt.getTime() <= startsAt.getTime()) {
      errors.push('La finalización debe ser posterior al inicio.')
    } else if (endsAt.getTime() - startsAt.getTime() < TASK_MINIMUM_DURATION_MINUTES * 60_000) {
      errors.push('La tarea debe durar al menos 30 minutos.')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      starts_at: startsAt ? startsAt.toISOString() : null,
      ends_at: endsAt ? endsAt.toISOString() : null,
      timezone: getTaskTimeZone(input),
    },
  }
}

export function hasTaskTimeWindow(task) {
  return Boolean(toValidDate(task?.starts_at ?? task?.startsAt) && toValidDate(task?.ends_at ?? task?.endsAt))
}

export function isTaskTimeWindowExpired(task, now = new Date()) {
  const endsAt = toValidDate(task?.ends_at ?? task?.endsAt)
  return Boolean(endsAt && endsAt.getTime() <= now.getTime())
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

export function formatTaskTimeWindow(task, { full = false } = {}) {
  const startsAt = task?.starts_at ?? task?.startsAt
  const endsAt = task?.ends_at ?? task?.endsAt
  const startDate = toValidDate(startsAt)
  const endDate = toValidDate(endsAt)
  if (!startDate || !endDate) return ''

  const timeZone = getTaskTimeZone(task)
  const dateOptions = full
    ? { weekday: 'long', day: '2-digit', month: 'long' }
    : { day: '2-digit', month: 'short' }
  const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  const startDateLabel = formatInTaskTimeZone(startDate, dateOptions, timeZone)
  const endDateLabel = formatInTaskTimeZone(endDate, dateOptions, timeZone)
  const startTimeLabel = formatInTaskTimeZone(startDate, timeOptions, timeZone)
  const endTimeLabel = formatInTaskTimeZone(endDate, timeOptions, timeZone)

  if (startDateLabel === endDateLabel) {
    return `${startDateLabel} · ${startTimeLabel}–${endTimeLabel}`
  }

  return `${startDateLabel}, ${startTimeLabel} – ${endDateLabel}, ${endTimeLabel}`
}

export function formatTaskAvailabilityShort(task) {
  const timeWindow = formatTaskTimeWindow(task)
  if (timeWindow) return timeWindow

  const dateLabel = formatAvailabilityDate(task?.requested_date, { short: true })
  const slotLabel = getTimeSlotLabel(task?.requested_time_slot, { short: true })
  const parts = [dateLabel, slotLabel].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : FALLBACK_AVAILABILITY_LABEL
}

export function formatTaskAvailabilityFull(task) {
  const timeWindow = formatTaskTimeWindow(task, { full: true })
  const baseLabel = timeWindow || formatTaskAvailabilityShort(task)
  const note = String(task?.requested_time_note || '').trim()

  return note ? `${baseLabel} · ${note}` : baseLabel
}

export function formatApplicationAvailability(application, task) {
  const response = normalizeAvailabilityResponse(application?.availability_response)

  if (response === 'matches') {
    return hasTaskTimeWindow(task) || task?.requested_date || task?.requested_time_slot || task?.requested_time_note
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
