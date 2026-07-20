const ratingFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function clampRating(value) {
  const rating = Number(value)
  if (!Number.isFinite(rating)) return 0
  return Math.min(Math.max(rating, 0), 5)
}

export function formatRating(value) {
  return ratingFormatter.format(clampRating(value))
}
