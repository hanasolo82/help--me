// Formato de moneda en es-ES para las pantallas de planes y facturación.
const euroFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
const amountFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** "4,99 €" */
export function formatEuro(value) {
  return euroFormatter.format(value)
}

/** Solo la cifra, para bloques de precio grandes: "4,99" (0 -> "0"). */
export function formatEuroAmount(value) {
  return value === 0 ? '0' : amountFormatter.format(value)
}
