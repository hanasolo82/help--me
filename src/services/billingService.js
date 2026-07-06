import {
  buildBackendUrl,
  MISSING_BACKEND_URL_ERROR,
  PAYMENT_SERVER_CONNECTION_ERROR,
  readBackendError,
} from '../lib/backendApi'
import { supabase } from '../lib/supabaseClient'

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
    throw new Error('Necesitas iniciar sesión para gestionar Premium.')
  }

  return accessToken
}

async function postBilling(path, fallbackError) {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(buildBackendUrl(path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch (error) {
    if (error?.message === MISSING_BACKEND_URL_ERROR) {
      throw error
    }

    throw new Error(PAYMENT_SERVER_CONNECTION_ERROR, { cause: error })
  }

  if (!response.ok) {
    throw new Error(await readBackendError(response, fallbackError))
  }

  return response.json().catch(() => ({}))
}

/** Inicia el checkout de suscripción Premium; devuelve la URL de Stripe. */
export async function startPremiumCheckout() {
  const payload = await postBilling('/api/billing/checkout', 'No pudimos preparar la suscripción.')

  if (!payload?.checkout_url) {
    throw new Error('Stripe no devolvió una URL válida de suscripción.')
  }

  return payload
}

/** Abre el portal de facturación de Stripe (gestionar tarjeta, cancelar, facturas). */
export async function openBillingPortal() {
  const payload = await postBilling('/api/billing/portal', 'No pudimos abrir el portal de facturación.')

  if (!payload?.portal_url) {
    throw new Error('Stripe no devolvió una URL válida del portal.')
  }

  return payload
}

/**
 * Estado premium del usuario autenticado. Lee la RPC has_active_premium
 * (fuente de verdad, la misma que usa el backend para los gates).
 */
export async function getMyPremiumStatus(userId) {
  if (!supabase) {
    throw new Error('No hay una sesión de Supabase configurada.')
  }

  const { data, error } = await supabase.rpc('has_active_premium', { p_user_id: userId })

  if (error) {
    throw error
  }

  return { active: Boolean(data) }
}
