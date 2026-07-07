/**
 * MAQUETA del flujo de suscripción /facturacion → /planes → /pago.
 *
 * Estos planes y precios son datos de diseño: NO conectan con Stripe ni cobran
 * nada. El único plan contratable real sigue siendo PREMIUM_PLAN (pricing.js,
 * 7,99 €/mes) desde Ajustes → Pagos. Cuando "Vecino Plus" / "Helper Pro" pasen
 * a ser reales (ver PRICING_PLANS.plus / helperPro, hoy ocultos en beta), sus
 * precios vivirán en Prices de Stripe y habrá que unificar ambos flujos.
 */

export const BILLING_CYCLES = Object.freeze({
  mensual: Object.freeze({
    id: 'mensual',
    label: 'Mensual',
    unit: '€ / mes',
    note: '',
  }),
  anual: Object.freeze({
    id: 'anual',
    label: 'Anual',
    unit: '€ / año',
    note: 'facturado anualmente',
    // 49,99 €/año frente a 59,88 € (12 × 4,99): ~17 % menos.
    savingsLabel: 'Ahorra 17%',
  }),
})

export const SUBSCRIPTION_PLANS = [
  {
    id: 'gratis',
    name: 'Gratis',
    subtitle: 'Pide y ofrece ayuda en tu barrio',
    icon: 'sprout',
    badge: null,
    featured: false,
    prices: { mensual: 0, anual: 0 },
    ctaLabel: 'Elegir plan',
    ctaNote: 'Sin tarjeta y sin permanencia.',
    featuresHeading: 'Incluye:',
    features: [
      'Publica solicitudes y recibe ayuda sin coste',
      'Chat dentro de la app',
      'Pago retenido hasta que confirmas la ayuda',
      'Perfiles con valoraciones de vecinos',
    ],
  },
  {
    id: 'plus',
    name: 'Vecino Plus',
    subtitle: 'Más comodidad y prioridad',
    icon: 'sparkles',
    badge: 'Recomendado',
    featured: true,
    prices: { mensual: 4.99, anual: 49.99 },
    ctaLabel: 'Elegir plan',
    ctaNote: 'Cancela cuando quieras.',
    featuresHeading: 'Todo lo de Gratis, y:',
    features: [
      'Tus solicitudes destacan en el mapa del barrio',
      'Avisos al instante de tareas cerca de ti',
      'Soporte con prioridad',
      'Acceso anticipado a nuevas funciones',
    ],
  },
  {
    id: 'pro',
    name: 'Helper Pro',
    subtitle: 'Para quien ayuda a menudo',
    icon: 'zap',
    badge: null,
    featured: false,
    prices: { mensual: 9.99, anual: 99.99 },
    ctaLabel: 'Elegir plan',
    ctaNote: 'Cancela cuando quieras.',
    featuresHeading: 'Todo lo de Vecino Plus, y:',
    features: [
      'Perfil destacado para recibir más encargos',
      'Panel con estadísticas de tus ayudas e ingresos',
      'Comisión reducida al cobrar tus ayudas',
      'Insignia Helper Pro en tu perfil',
    ],
  },
]

export function getPlanById(planId) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) || null
}

// Estado de cuenta de ejemplo para /facturacion. El "método de pago" es una
// cadena ya enmascarada: en ningún punto se capturan datos reales de tarjeta.
export const MOCK_BILLING = Object.freeze({
  planId: 'plus',
  cycle: 'mensual',
  paymentMethodLabel: 'Visa ···· 4242',
})
