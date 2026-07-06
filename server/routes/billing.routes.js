import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { createBillingPortalSession, createPremiumCheckout } from '../services/billing.service.js'

const router = express.Router()

function asyncHandler(handler) {
  return function routeHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

// Inicia el checkout de suscripción "HelpMe Premium" (Stripe aloja el pago).
router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await createPremiumCheckout({
      user: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

// Portal de facturación: gestionar tarjeta, cancelar, descargar facturas.
router.post(
  '/portal',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await createBillingPortalSession({
      user: {
        id: req.user.id,
        email: req.user.email || null,
      },
    })

    return res.status(200).json(result)
  }),
)

export default router
