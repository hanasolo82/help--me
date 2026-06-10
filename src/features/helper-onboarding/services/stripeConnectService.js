import { buildBackendUrl, readBackendError, STRIPE_SERVER_CONNECTION_ERROR } from '../../../lib/backendApi'
import { supabase } from '../../../lib/supabaseClient'

async function getAccessToken() {
  if (!supabase) {
    throw new Error('No hay una sesión de Supabase configurada.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || 'No pudimos leer tu sesión.')
  }

  const accessToken = sessionData?.session?.access_token

  if (!accessToken) {
    throw new Error('Necesitas iniciar sesión para continuar con Stripe.')
  }

  return accessToken
}

export async function startStripeConnectOnboarding() {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(buildBackendUrl('/api/stripe/connect/account-link'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    throw new Error(STRIPE_SERVER_CONNECTION_ERROR)
  }

  if (!response.ok) {
    throw new Error(await readBackendError(response, 'No pudimos preparar el onboarding de Stripe.'))
  }

  const payload = await response.json().catch(() => ({}))

  if (!payload?.url) {
    throw new Error('Stripe no devolvió una URL válida.')
  }

  window.location.href = payload.url
}

export async function syncStripeConnectStatus() {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(buildBackendUrl('/api/stripe/connect/account-status'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw new Error(STRIPE_SERVER_CONNECTION_ERROR)
  }

  if (!response.ok) {
    throw new Error(await readBackendError(response, 'No pudimos sincronizar el estado de Stripe.'))
  }

  const payload = await response.json().catch(() => ({}))

  return payload
}
