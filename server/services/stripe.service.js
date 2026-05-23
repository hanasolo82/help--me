import Stripe from 'stripe'
import { loadServerEnv } from '../config/env.js'

const { env } = loadServerEnv()

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

export async function createConnectAccount({ email, country = 'ES', userId }) {
  return stripe.accounts.create({
    type: 'express',
    country,
    email: email || undefined,
    capabilities: {
      transfers: {
        requested: true,
      },
    },
    metadata: {
      app_user_id: userId || '',
    },
  })
}

export async function createConnectAccountLink({ accountId }) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${env.APP_URL}/settings?stripe=refresh`,
    return_url: `${env.APP_URL}/settings?stripe=return`,
    type: 'account_onboarding',
  })
}

export function constructStripeEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
}
