import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  constructStripeEvent,
  createConnectAccount,
  createConnectAccountLink,
} from '../services/stripe.service.js'

const router = express.Router()

function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['stripe-signature']

    if (!signature) {
      return res.status(400).json({
        error: 'Missing Stripe signature header.',
      })
    }

    try {
      const event = constructStripeEvent(req.body, signature)
      console.info(`[stripe:webhook] ${event.type}`)

      return res.status(200).json({
        received: true,
        type: event.type,
      })
    } catch (error) {
      console.error('[stripe:webhook] Invalid webhook signature', error.message)
      return res.status(400).json({
        error: 'Invalid Stripe webhook signature.',
      })
    }
  },
)

router.use(express.json({ limit: '1mb' }))

router.post(
  '/connect/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const country = typeof req.body?.country === 'string' ? req.body.country.trim().toUpperCase() : 'ES'
    const account = await createConnectAccount({
      email: req.auth.user.email,
      country,
      userId: req.auth.user.id,
    })

    return res.status(201).json({
      account,
    })
  }),
)

router.post(
  '/connect/account-link',
  requireAuth,
  asyncHandler(async (req, res) => {
    const accountId = typeof req.body?.accountId === 'string' ? req.body.accountId.trim() : ''

    if (!accountId) {
      return res.status(400).json({
        error: 'accountId is required.',
      })
    }

    const accountLink = await createConnectAccountLink({ accountId })

    return res.status(200).json({
      accountLink,
    })
  }),
)

export default router
