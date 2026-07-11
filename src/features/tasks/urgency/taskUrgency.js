export const TASK_URGENCY_THRESHOLDS_MINUTES = Object.freeze({
  veryUrgent: 60,
  urgent: 120,
})

function toValidDate(value) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatMinutesUntilStart(minutes) {
  if (minutes < 60) return `Empieza en ${minutes} min`

  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder > 0 ? `Empieza en ${hours} h ${remainder} min` : `Empieza en ${hours} h`
}

export function getTaskUrgency(task, now = new Date()) {
  const startsAt = toValidDate(task?.starts_at ?? task?.startsAt)
  if (!startsAt) return null

  const millisecondsUntilStart = startsAt.getTime() - now.getTime()
  if (millisecondsUntilStart <= 0) return null

  const minutesUntilStart = Math.ceil(millisecondsUntilStart / 60_000)

  if (millisecondsUntilStart < TASK_URGENCY_THRESHOLDS_MINUTES.veryUrgent * 60_000) {
    return {
      key: 'very_urgent',
      label: 'Muy urgente',
      detail: formatMinutesUntilStart(minutesUntilStart),
      minutesUntilStart,
    }
  }

  if (millisecondsUntilStart <= TASK_URGENCY_THRESHOLDS_MINUTES.urgent * 60_000) {
    return {
      key: 'urgent',
      label: 'Urgente',
      detail: formatMinutesUntilStart(minutesUntilStart),
      minutesUntilStart,
    }
  }

  return null
}
