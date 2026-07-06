import { loadServerEnv } from '../config/env.js'
import { supabaseAdmin } from './supabase.service.js'
import { stripe } from './stripe.service.js'
import { createIdempotentAuditEvent } from './financial.service.js'

const { env } = loadServerEnv()

// Estados de Stripe → estados permitidos por el check de user_subscriptions.
const STRIPE_TO_LOCAL_STATUS = Object.freeze({
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'unpaid',
  incomplete: 'inactive',
  incomplete_expired: 'canceled',
  paused: 'inactive',
})

function createBillingError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function ensureSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client is not configured.')
  }
}

function ensurePremiumPriceConfigured() {
  if (!env.STRIPE_PREMIUM_PRICE_ID) {
    throw createBillingError(
      'Falta STRIPE_PREMIUM_PRICE_ID en server/.env: crea el Price recurrente de Premium en Stripe y copia su id.',
      503,
    )
  }
}

async function getSubscriptionRowByUserId(userId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function getSubscriptionRowByCustomerId(stripeCustomerId) {
  ensureSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

function isSubscriptionRowActive(row) {
  if (!row) return false
  if (!['active', 'trialing'].includes(row.subscription_status)) return false
  if (!row.current_period_end) return true
  return new Date(row.current_period_end).getTime() > Date.now()
}

/** Cliente de Stripe por usuario: reutiliza el de user_subscriptions o lo crea. */
async function getOrCreateStripeCustomer(user) {
  const existing = await getSubscriptionRowByUserId(user.id)

  if (existing?.stripe_customer_id) {
    return { customerId: existing.stripe_customer_id, row: existing }
  }

  const customer = await stripe.customers.create({
    email: user.email || undefined,
    metadata: { helpme_user_id: user.id },
  })

  const { data, error } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: user.id,
        provider: 'stripe',
        subscription_status: existing?.subscription_status || 'inactive',
        stripe_customer_id: customer.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .maybeSingle()

  if (error) throw error

  return { customerId: customer.id, row: data }
}

/** Checkout de suscripción "HelpMe Premium" (mensual, gestionada por Stripe). */
export async function createPremiumCheckout({ user }) {
  ensureSupabaseAdmin()
  ensurePremiumPriceConfigured()

  if (!user?.id) {
    throw createBillingError('Necesitas iniciar sesion.', 401)
  }

  const existing = await getSubscriptionRowByUserId(user.id)
  if (isSubscriptionRowActive(existing)) {
    throw createBillingError('Ya tienes Premium activo. Gestiona tu suscripción desde el portal.', 409)
  }

  const { customerId } = await getOrCreateStripeCustomer(user)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: env.STRIPE_PREMIUM_PRICE_ID, quantity: 1 }],
    success_url: `${env.APP_URL}/settings?premium=success`,
    cancel_url: `${env.APP_URL}/settings?premium=cancelled`,
    metadata: { helpme_user_id: user.id },
    subscription_data: {
      metadata: { helpme_user_id: user.id },
    },
  })

  await createIdempotentAuditEvent({
    eventType: 'premium_checkout_started',
    severity: 'info',
    actorType: 'requester',
    actorProfileId: user.id,
    entityType: 'user_subscription',
    entityId: user.id,
    afterState: { checkout_session_id: session.id },
    metadata: { stripe_customer_id: customerId },
  })

  return { checkout_url: session.url, session_id: session.id }
}

/** Portal de facturación de Stripe: cambiar tarjeta, cancelar, ver facturas. */
export async function createBillingPortalSession({ user }) {
  ensureSupabaseAdmin()

  if (!user?.id) {
    throw createBillingError('Necesitas iniciar sesion.', 401)
  }

  const row = await getSubscriptionRowByUserId(user.id)

  if (!row?.stripe_customer_id) {
    throw createBillingError('Todavía no tienes datos de facturación. Suscríbete primero a Premium.', 404)
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${env.APP_URL}/settings`,
  })

  return { portal_url: session.url }
}

/**
 * Upsert canónico desde webhooks customer.subscription.* — única vía por la que
 * user_subscriptions cambia de estado (el frontend solo lee).
 */
export async function syncSubscriptionFromStripe(subscription) {
  ensureSupabaseAdmin()

  if (!subscription?.id) {
    throw createBillingError('Invalid Stripe subscription payload.', 400)
  }

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || null

  // El user llega en metadata (lo ponemos al crear el checkout); si un evento
  // viene sin metadata (p. ej. cambios manuales en el Dashboard), lo resolvemos
  // por el customer ya vinculado.
  let userId = subscription.metadata?.helpme_user_id || null

  if (!userId && customerId) {
    const rowByCustomer = await getSubscriptionRowByCustomerId(customerId)
    userId = rowByCustomer?.user_id || null
  }

  if (!userId) {
    return { skipped: true, reason: 'Subscription without resolvable HelpMe user.', subscription_id: subscription.id }
  }

  const status = STRIPE_TO_LOCAL_STATUS[subscription.status] || 'inactive'
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null

  const { error } = await supabaseAdmin
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        provider: 'stripe',
        subscription_status: status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        current_period_end: currentPeriodEnd,
        metadata: {
          stripe_status: subscription.status,
          cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
          price_id: subscription.items?.data?.[0]?.price?.id || null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )

  if (error) throw error

  return {
    skipped: false,
    user_id: userId,
    subscription_id: subscription.id,
    subscription_status: status,
    current_period_end: currentPeriodEnd,
  }
}
