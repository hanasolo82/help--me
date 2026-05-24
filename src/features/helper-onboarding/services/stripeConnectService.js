import { supabase } from '../../../lib/supabaseClient'

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_URL
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : 'http://localhost:3001'
}

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
    response = await fetch(`${getApiBaseUrl()}/api/stripe/connect/account-link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    throw new Error(
      `No pudimos conectar con el servidor de Stripe en ${getApiBaseUrl()}. Asegúrate de que el backend esté arrancado.`,
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'No pudimos preparar el onboarding de Stripe.')
  }

  if (!payload?.url) {
    throw new Error('Stripe no devolvió una URL válida.')
  }

  window.location.href = payload.url
}

export async function syncStripeConnectStatus() {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(`${getApiBaseUrl()}/api/stripe/connect/account-status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw new Error(
      `No pudimos sincronizar el estado de Stripe con el servidor en ${getApiBaseUrl()}. Asegúrate de que el backend esté arrancado.`,
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'No pudimos sincronizar el estado de Stripe.')
  }

  return payload
}
