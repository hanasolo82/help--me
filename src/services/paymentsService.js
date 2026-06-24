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
    throw new Error('Necesitas iniciar sesión para continuar con el pago.')
  }

  return accessToken
}

export async function getPaymentForTask(taskId, { signal } = {}) {
  if (!supabase) {
    throw new Error('No hay una sesión de Supabase configurada.')
  }

  let query = supabase
    .from('payments')
    .select('id, task_id, status, provider')
    .eq('task_id', taskId)
    .maybeSingle()

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  if (!data?.id) {
    throw new Error('No encontramos un pago asociado a esta tarea.')
  }

  return data
}

export async function startTaskCheckout(taskId, { onTiming } = {}) {
  const startedAt = performance.now()
  const sessionStartedAt = performance.now()
  const accessToken = await getAccessToken()
  onTiming?.({
    phase: 'session',
    durationMs: Math.round(performance.now() - sessionStartedAt),
  })

  let response
  const requestStartedAt = performance.now()

  try {
    response = await fetch(buildBackendUrl('/api/payments/checkout'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId }),
    })
  } catch (error) {
    if (error?.message === MISSING_BACKEND_URL_ERROR) {
      throw error
    }

    throw new Error(PAYMENT_SERVER_CONNECTION_ERROR, { cause: error })
  }

  onTiming?.({
    phase: 'checkout_request',
    durationMs: Math.round(performance.now() - requestStartedAt),
  })

  if (!response.ok) {
    throw new Error(await readBackendError(response, 'No pudimos preparar el checkout.'))
  }

  const payload = await response.json().catch(() => ({}))

  if (!payload?.checkout_url) {
    throw new Error('Stripe no devolvió una URL válida de checkout.')
  }

  onTiming?.({
    phase: 'checkout_ready',
    durationMs: Math.round(performance.now() - startedAt),
  })

  return payload
}

export async function continueWithExternalPayment(taskId) {
  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(buildBackendUrl('/api/payments/external'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId }),
    })
  } catch (error) {
    if (error?.message === MISSING_BACKEND_URL_ERROR) {
      throw error
    }

    throw new Error(PAYMENT_SERVER_CONNECTION_ERROR, { cause: error })
  }

  if (!response.ok) {
    throw new Error(await readBackendError(response, 'No pudimos confirmar el pago externo.'))
  }

  const payload = await response.json().catch(() => ({}))

  return payload
}

export async function releaseTaskPayment(taskId, { signal } = {}) {
  const payment = await getPaymentForTask(taskId, { signal })

  if (payment.provider === 'external' || payment.status === 'external_agreed') {
    return {
      payment_id: payment.id,
      task_id: taskId,
      provider: payment.provider,
      payment_status: payment.status,
      external: true,
      skipped_release: true,
    }
  }

  const accessToken = await getAccessToken()

  let response

  try {
    response = await fetch(buildBackendUrl(`/api/payments/${payment.id}/release`), {
      method: 'POST',
      signal,
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
    throw new Error(await readBackendError(response, 'No pudimos autorizar la liberacion del pago.'))
  }

  const payload = await response.json().catch(() => ({}))

  return payload
}
