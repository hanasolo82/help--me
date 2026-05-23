import Stripe from 'stripe'
import { loadServerEnv } from '../config/env.js'
import { supabaseAdmin } from './supabase.service.js'

const { env } = loadServerEnv()

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

async function getProfileByUserId(userId) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function updateProfileStripeData(profileId, updates) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...updates,
      last_stripe_sync_at: new Date().toISOString(),
    })
    .eq('id', profileId)
    .select('id, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function createOrGetConnectAccount(user, profile) {
  if (!user?.id) {
    throw new Error('Missing authenticated user.')
  }

  const currentProfile = profile || (await getProfileByUserId(user.id))

  if (!currentProfile) {
    throw new Error('Profile not found.')
  }

  if (currentProfile.stripe_account_id) {
    return currentProfile.stripe_account_id
  }

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'ES',
    email: user.email || undefined,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      app_user_id: user.id,
      profile_id: currentProfile.id,
    },
  })

  await updateProfileStripeData(currentProfile.id, {
    stripe_account_id: account.id,
  })

  return account.id
}

// Account Links son de un solo uso: si el usuario vuelve a pedir acceso,
// hay que crear un link nuevo desde backend.
export async function createConnectAccountLink(accountId) {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${env.APP_URL}/stripe/refresh`,
    return_url: `${env.APP_URL}/stripe/return`,
    type: 'account_onboarding',
  })

  return accountLink.url
}

export async function syncStripeAccountFromWebhook(account) {
  if (!account?.id) {
    return null
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const updates = {
    stripe_onboarding_completed: Boolean(account.details_submitted),
    stripe_charges_enabled: Boolean(account.charges_enabled),
    stripe_payouts_enabled: Boolean(account.payouts_enabled),
    last_stripe_sync_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('stripe_account_id', account.id)
    .select('id, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export function constructStripeEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
}
