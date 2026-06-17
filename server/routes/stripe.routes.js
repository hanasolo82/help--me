import express from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import {
  createConnectAccountLink,
  createOrGetConnectAccount,
  syncStripeAccountByAccountId,
  constructStripeEvent,
} from '../services/stripe.service.js'
import {
  ensureStripeWebhookSignatureHeader,
  processStripeWebhookEvent,
} from '../services/financial.service.js'
import { supabaseAdmin } from '../services/supabase.service.js'

const router = express.Router()
const isDevelopment = globalThis.process?.env?.NODE_ENV !== 'production'

function asyncHandler(handler) {
  return function routeHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

router.post(
  '/connect/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id')
      .eq('id', req.user.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found.',
      })
    }

    const accountId = await createOrGetConnectAccount(req.user, profile)

    if (isDevelopment) {
      console.info('[stripe] connected account ready for user', req.user.id)
    }

    return res.status(200).json({
      accountId,
    })
  }),
)

router.post(
  '/connect/account-link',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id')
      .eq('id', req.user.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!profile) {
      return res.status(404).json({
        error: 'Profile not found.',
      })
    }

    const accountId = await createOrGetConnectAccount(req.user, profile)
    const url = await createConnectAccountLink(accountId)

    if (isDevelopment) {
      console.info('[stripe] onboarding link generated for user', req.user.id)
    }

    return res.status(200).json({
      url,
    })
  }),
)

router.get(
  '/connect/account-status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, stripe_account_id')
      .eq('id', req.user.id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!profile?.stripe_account_id) {
      return res.status(200).json({
        connected: false,
        stripe_onboarding_completed: false,
        stripe_charges_enabled: false,
        stripe_payouts_enabled: false,
      })
    }

    const syncedProfile = await syncStripeAccountByAccountId(profile.stripe_account_id)

    return res.status(200).json({
      connected: Boolean(syncedProfile),
      stripe_onboarding_completed: Boolean(syncedProfile?.stripe_onboarding_completed),
      stripe_charges_enabled: Boolean(syncedProfile?.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(syncedProfile?.stripe_payouts_enabled),
      last_stripe_sync_at: syncedProfile?.last_stripe_sync_at || null,
    })
  }),
)

// El webhook recibe el raw body desde app.use('/api/stripe/webhook', express.raw(...)).
router.post(
  '/webhook',
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature']

    try {
      ensureStripeWebhookSignatureHeader(signature)
      const event = constructStripeEvent(req.body, signature)
      if (isDevelopment) {
        console.info(`[stripe:webhook] ${event.type}`)
      }

      const result = await processStripeWebhookEvent(event)

      if (result?.processing) {
        return res.status(409).json({
          received: false,
          retry: true,
          error: 'Stripe webhook event is already processing.',
        })
      }

      return res.status(200).json({
        received: true,
      })
    } catch (error) {
      if (error?.statusCode === 400 && error?.message === 'Missing Stripe signature header.') {
        return res.status(400).json({
          error: error.message,
        })
      }

      if (error?.type === 'StripeSignatureVerificationError' || /signature/i.test(String(error?.message || ''))) {
        console.error('[stripe:webhook] Invalid signature', error?.message || error)
        return res.status(400).json({
          error: 'Invalid Stripe webhook signature.',
        })
      }

      throw error
    }
  }),
)

export default router
