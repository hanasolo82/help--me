import Stripe from 'stripe'
import { loadServerEnv } from '../config/env.js'
import { supabaseAdmin } from './supabase.service.js'

const { env } = loadServerEnv()

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

export { stripe }

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

async function getConnectAccountByProfileId(profileId) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('connect_accounts')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getConnectAccountByStripeAccountId(accountId) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const { data, error } = await supabaseAdmin
    .from('connect_accounts')
    .select('*')
    .eq('stripe_account_id', accountId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

async function getLegacyProfileByStripeAccountId(accountId) {
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

async function upsertConnectAccount(profileId, account) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const payload = {
    profile_id: profileId,
    stripe_account_id: account.id,
    country: account.country || 'ES',
    default_currency: account.default_currency || 'eur',
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    disabled_reason: account.requirements?.disabled_reason || account.disabled_reason || null,
    capabilities: account.capabilities || {},
    requirements: account.requirements || {},
    future_requirements: account.future_requirements || {},
    last_stripe_sync_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin
    .from('connect_accounts')
    .upsert(payload, { onConflict: 'profile_id' })
    .select('*')
    .single()

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

  const existingConnectAccount = await getConnectAccountByProfileId(currentProfile.id)

  if (existingConnectAccount?.stripe_account_id) {
    return existingConnectAccount.stripe_account_id
  }

  if (currentProfile.stripe_account_id) {
    const legacyAccount = await getAccountFromStripe(currentProfile.stripe_account_id)

    if (legacyAccount?.id) {
      await upsertConnectAccount(currentProfile.id, legacyAccount)
      return legacyAccount.id
    }
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

  await upsertConnectAccount(currentProfile.id, account)

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

  const connectAccount = await getConnectAccountByStripeAccountId(accountId)
  const legacyProfile = connectAccount ? null : await getLegacyProfileByStripeAccountId(accountId)
  const profileId = connectAccount?.profile_id || legacyProfile?.id

  if (!profileId) {
    return null
  }

  await upsertConnectAccount(profileId, account)
  return getLegacyProfileByStripeAccountId(accountId)
}

export async function syncStripeAccountFromWebhook(account) {
  if (!account?.id) {
    return null
  }

  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }

  const connectAccount = await getConnectAccountByStripeAccountId(account.id)
  const legacyProfile = connectAccount ? null : await getLegacyProfileByStripeAccountId(account.id)
  const profileId = connectAccount?.profile_id || legacyProfile?.id || account.metadata?.profile_id

  if (!profileId) {
    return null
  }

  await upsertConnectAccount(profileId, account)
  return getLegacyProfileByStripeAccountId(account.id)
}

export function constructStripeEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
}

export {
  getConnectAccountByProfileId,
  getConnectAccountByStripeAccountId,
  getProfileByUserId,
}
