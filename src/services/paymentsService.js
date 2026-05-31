import { supabase } from '../lib/supabaseClient'

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
    throw new Error('Necesitas iniciar sesión para continuar con el pago.')
  }

  return accessToken
}

async function getPaymentForTask(taskId) {
  if (!supabase) {
    throw new Error('No hay una sesión de Supabase configurada.')
  }

  const { data, error } = await supabase
    .from('payments')
    .select('id, task_id, status')
    .eq('task_id', taskId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data?.id) {
    throw new Error('No encontramos un pago asociado a esta tarea.')
  }

  return data
}

export async function startTaskCheckout(taskId) {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(`${getApiBaseUrl()}/api/payments/checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId }),
    })
  } catch {
    throw new Error(
      `No pudimos conectar con el servidor de pagos en ${getApiBaseUrl()}. Asegúrate de que el backend esté arrancado.`,
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'No pudimos preparar el checkout.')
  }

  if (!payload?.checkout_url) {
    throw new Error('Stripe no devolvió una URL válida de checkout.')
  }

  return payload
}

export async function releaseTaskPayment(taskId) {
  const payment = await getPaymentForTask(taskId)
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(`${getApiBaseUrl()}/api/payments/${payment.id}/release`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
  } catch {
    throw new Error(
      `No pudimos conectar con el servidor de pagos en ${getApiBaseUrl()}. Asegúrate de que el backend esté arrancado.`,
    )
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'No pudimos autorizar la liberacion del pago.')
  }

  return payload
}
