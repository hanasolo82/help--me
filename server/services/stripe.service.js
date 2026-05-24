import Stripe from 'stripe'
import { loadServerEnv } from '../config/env.js'
import { supabaseAdmin } from './supabase.service.js'

const { env } = loadServerEnv()

const stripe = new Stripe(env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2024-06-20',
})

function createConnectNotEnabledError(originalError) {
  const error = new Error(
    'Stripe Connect no está activado en esta cuenta. Activa Connect en el Dashboard de Stripe antes de crear cuentas Express.',
  )

  error.statusCode = 403
  error.cause = originalError
  return error
}

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
    .select(
      'id, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled, last_stripe_sync_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data
}

async function getProfileByStripeAccountId(accountId) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, stripe_account_id, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled')
    .eq('stripe_account_id', accountId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getAccountFromStripe(accountId) {
  if (!accountId) {
    return null
  }

  return stripe.accounts.retrieve(accountId)
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

  let account

  try {
    account = await stripe.accounts.create({
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
  } catch (error) {
    if (error?.message?.includes("You've signed up for Connect") || error?.code === 'account_invalid') {
      throw createConnectNotEnabledError(error)
    }

    throw error
  }

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
    refresh_url: `${env.APP_URL}/stripe/refresh?flow=helper-onboarding`,
    return_url: `${env.APP_URL}/stripe/return?flow=helper-onboarding`,
    type: 'account_onboarding',
  })

  return accountLink.url
}

export async function syncStripeAccountByAccountId(accountId) {
  if (!accountId) {
    return null
  }

  const account = await getAccountFromStripe(accountId)

  if (!account?.id) {
    return null
  }

  const profile = await getProfileByStripeAccountId(accountId)

  if (!profile?.id) {
    return null
  }

  return updateProfileStripeData(profile.id, {
    stripe_onboarding_completed: Boolean(account.details_submitted),
    stripe_charges_enabled: Boolean(account.charges_enabled),
    stripe_payouts_enabled: Boolean(account.payouts_enabled),
  })
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
