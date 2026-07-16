// Franjas horarias de la matriz de disponibilidad pública (estilo Babysits).
// profile_availability ya guarda start_time/end_time por fila, así que cada
// celda marcada (día × franja) se persiste como una fila con el rango de la
// franja — sin migraciones. Las filas legacy de día completo (00:00–23:59,
// las que escribe el onboarding) cubren las cuatro franjas al leerse.

export const TIME_SLOTS = [
  { id: 'morning', label: 'Mañana', start: '08:00', end: '12:00' },
  { id: 'midday', label: 'Mediodía', start: '12:00', end: '16:00' },
  { id: 'afternoon', label: 'Tarde', start: '16:00', end: '20:00' },
  { id: 'night', label: 'Noche', start: '20:00', end: '23:59' },
]

export const WEEK_DAYS = [
  { day: 1, short: 'Lu', label: 'Lunes' },
  { day: 2, short: 'Ma', label: 'Martes' },
  { day: 3, short: 'Mi', label: 'Miércoles' },
  { day: 4, short: 'Ju', label: 'Jueves' },
  { day: 5, short: 'Vi', label: 'Viernes' },
  { day: 6, short: 'Sá', label: 'Sábado' },
  { day: 0, short: 'Do', label: 'Domingo' },
]

export function cellKey(day, slotId) {
  return `${day}:${slotId}`
}

// 'HH:MM' comparado como texto funciona: ancho fijo y orden lexicográfico.
function normalizeTime(value, fallback) {
  const text = String(value ?? '').slice(0, 5)
  return /^\d{2}:\d{2}$/.test(text) ? text : fallback
}

// Filas de profile_availability → Set de claves "día:franja". Una fila cubre
// una franja si sus rangos se solapan (duración > 0), de modo que tanto las
// filas exactas de franja como las legacy de día completo se leen bien.
export function slotsToCellSet(rows = []) {
  const cells = new Set()

  for (const row of rows) {
    const day = Number(row?.day_of_week)
    if (!Number.isInteger(day) || day < 0 || day > 6) continue

    const start = normalizeTime(row?.start_time, '00:00')
    const end = normalizeTime(row?.end_time, '23:59')

    for (const slot of TIME_SLOTS) {
      if (start < slot.end && end > slot.start) {
        cells.add(cellKey(day, slot.id))
      }
    }
  }

  return cells
}

// Set de claves "día:franja" → filas listas para insertar en profile_availability.
export function cellSetToRows(cells) {
  const rows = []

  for (const { day } of WEEK_DAYS) {
    for (const slot of TIME_SLOTS) {
      if (cells.has(cellKey(day, slot.id))) {
        rows.push({ day_of_week: day, start_time: slot.start, end_time: slot.end })
      }
    }
  }

  return rows
}
