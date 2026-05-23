import { supabase } from '../../../lib/supabaseClient'

function getApiBaseUrl() {
  const value = import.meta.env.VITE_API_URL
  return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : 'http://localhost:3001'
}

export async function startStripeConnectOnboarding() {
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

  const response = await fetch(`${getApiBaseUrl()}/api/stripe/connect/account-link`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'No pudimos preparar el onboarding de Stripe.')
  }

  if (!payload?.url) {
    throw new Error('Stripe no devolvió una URL válida.')
  }

  window.location.href = payload.url
}
