export const PRICING_PHASE = 'closed_beta'

export const PRICING_COPY = Object.freeze({
  paymentValue: 'Pago retenido hasta confirmar',
  paymentCta: 'Pagar con pago retenido',
  paymentPending: 'Estamos confirmando tu pago con Stripe. Esto puede tardar unos segundos.',
  paymentDelayed: 'Esto esta tardando mas de lo normal. Puedes volver al detalle; seguiremos comprobando.',
  paymentWaiting: 'Seguimos esperando la confirmacion de Stripe. No necesitas repetir el pago.',
  paymentConfirmed: 'Pago confirmado. La tarea ya esta en curso. Volvemos al detalle ahora.',
  paymentUnconfirmed:
    'No hemos podido confirmar tu pago todavia. No se ha cobrado de mas ni se ha perdido dinero.',
  paymentSummary: 'Pide ayuda gratis. Paga retenido. Libera cuando estes conforme.',
  releaseHelperPayment: 'Libera el pago cuando la tarea este hecha',
  reportBeforeRelease: 'Puedes reportar un problema antes de liberar',
  betaNoCommission: 'Beta cerrada: sin comisión de HelpMe.',
  helperKeepsPrice: 'El helper ve el 100% del precio acordado.',
})

export const FORBIDDEN_PRICING_COPY = Object.freeze([
  'seguro',
  'reembolso garantizado',
  'protección total',
  'escrow',
  'soporte 24/7',
])

export const PRICING_FLAGS = Object.freeze({
  betaCommissionBps: 0,
  feePaidBy: 'requester',
  realFeesEnabled: false,
  subscriptionsEnabled: false,
  premiumExternalPaymentVisibleInBeta: false,
  plusVisibleInBeta: false,
  urgentVisibleInBeta: false,
  helperProVisibleInBeta: false,
})

export const PRICING_PLANS = Object.freeze({
  taskPublishing: {
    id: 'task_publishing',
    label: 'Publicar tarea',
    user: 'requester',
    beta: {
      visible: true,
      priceCents: 0,
    },
  },
  heldPayment: {
    id: 'held_payment',
    label: PRICING_COPY.paymentValue,
    user: 'requester',
    feePaidBy: PRICING_FLAGS.feePaidBy,
    beta: {
      visible: true,
      commissionBps: PRICING_FLAGS.betaCommissionBps,
    },
    ga: {
      commissionBps: 800,
      minimumFeeCents: 149,
      paidBy: PRICING_FLAGS.feePaidBy,
    },
  },
  plus: {
    id: 'plus',
    label: 'Proteccion Plus',
    user: 'requester',
    beta: {
      visible: PRICING_FLAGS.plusVisibleInBeta,
    },
    ga: {
      commissionBps: 1200,
      minimumFeeCents: 249,
      paidBy: PRICING_FLAGS.feePaidBy,
    },
  },
  urgentBoost: {
    id: 'urgent_boost',
    label: 'Urgente / Destacar',
    user: 'requester',
    beta: {
      visible: PRICING_FLAGS.urgentVisibleInBeta,
    },
    ga: {
      fixedFeeCents: 299,
      paidBy: PRICING_FLAGS.feePaidBy,
    },
  },
  helperPro: {
    id: 'helper_pro',
    label: 'Helper Pro',
    user: 'helper',
    beta: {
      visible: PRICING_FLAGS.helperProVisibleInBeta,
    },
    ga: {
      monthlyPriceCents: 799,
    },
  },
})

export const PRICING_NOTES = Object.freeze({
  beta: 'Closed beta keeps HelpMe commission at 0 bps and does not activate real platform fees.',
  gaFeeBearer: 'For GA, platform fees are documented as paid by the requester on top of the task price.',
  noCheckoutBinding: 'These constants are product/copy metadata only and must not drive checkout math in beta.',
})
