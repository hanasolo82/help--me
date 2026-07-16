function hasText(value) {
  return Boolean(String(value ?? '').trim())
}

export function getProfileName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

export function getProfileDisplayName(profile) {
  return getProfileName(profile)
}

export function getProfileHandle(profile) {
  return profile?.username ? `@${profile.username}` : '@helpme'
}

export function getLocationLabel(profile) {
  if (!profile) return 'Zona aproximada'
  if (profile.show_approx_location === false) return 'Zona oculta'
  if (profile.visible_zone_name) return profile.visible_zone_name

  const parts = [profile.city, profile.country].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')

  return profile.neighborhood || 'Zona aproximada'
}

export function formatResponseTime(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return 'Respuesta flexible'
  if (value < 60) return `Responde en ${value} min`

  const hours = Math.round(value / 60)
  return `Responde en ${hours} h`
}

export function formatHourlyRate(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value) || value <= 0) return 'Precio a consultar'
  return `${value.toFixed(0)} €/h`
}

export function summarizeReviews(reviews = []) {
  if (reviews.length === 0) {
    return {
      average: 0,
      total: 0,
      completed: 0,
    }
  }

  const total = reviews.length
  const average = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total

  return {
    average,
    total,
    completed: total,
  }
}

export function deriveAvailabilitySummary(availability = []) {
  if (availability.length === 0) return 'Disponibilidad no publicada.'

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const days = new Set(availability.map((slot) => dayNames[Number(slot.day_of_week)]).filter(Boolean))
  return `Disponible en ${Array.from(days).slice(0, 3).join(', ')}`
}

export function formatAvailabilityUpdatedAt(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function deriveAvailabilityUpdatedAt(availability = []) {
  const timestamps = availability
    .map((slot) => slot?.updated_at || slot?.created_at || null)
    .filter(Boolean)

  if (timestamps.length === 0) return ''

  const latest = timestamps.reduce((current, next) => {
    const currentTime = new Date(current).getTime()
    const nextTime = new Date(next).getTime()
    return Number.isFinite(nextTime) && nextTime > currentTime ? next : current
  }, timestamps[0])

  return formatAvailabilityUpdatedAt(latest)
}

// Sin "Valoración": vive solo en el aside (regla: cada dato una única vez).
export function buildTrustMetricItems(profile, reviewSummary = {}) {
  return [
    {
      label: 'Opiniones',
      value: String(reviewSummary.total || profile?.reviews_count || 0),
      meta: 'comunidad',
    },
    {
      label: 'Tareas',
      value: String(Number(profile?.completed_tasks ?? 0)),
      meta: 'completadas',
    },
    {
      label: 'Respuesta',
      value: formatResponseTime(profile?.response_time_minutes),
      meta: 'promedio',
    },
    {
      label: 'Tarifa',
      value: formatHourlyRate(profile?.hourly_rate),
      meta: 'aprox.',
    },
  ]
}

export function hasProfileBasics(profile) {
  return hasText(profile?.display_name || profile?.full_name || profile?.username)
}
