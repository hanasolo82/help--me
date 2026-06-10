const BACKEND_ENV_KEYS = [
  'VITE_BACKEND_URL',
  'VITE_API_BASE_URL',
  'VITE_PAYMENTS_API_URL',
  'VITE_API_URL',
]

function getConfiguredBackendUrl() {
  for (const key of BACKEND_ENV_KEYS) {
    const value = import.meta.env[key]

    if (typeof value === 'string' && value.trim()) {
      return value.trim().replace(/\/+$/, '')
    }
  }

  return ''
}

export function getBackendBaseUrl() {
  const configuredUrl = getConfiguredBackendUrl()

  if (configuredUrl) {
    return configuredUrl
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:3001'
  }

  return ''
}

export function buildBackendUrl(path) {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${getBackendBaseUrl()}${normalizedPath}`
}

export const PAYMENT_SERVER_CONNECTION_ERROR =
  'No pudimos conectar con el servidor de pagos. Inténtalo de nuevo en unos segundos.'

export const STRIPE_SERVER_CONNECTION_ERROR =
  'No pudimos conectar con el servidor de Stripe. Inténtalo de nuevo en unos segundos.'

export async function readBackendError(response, fallbackMessage) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}))

    if (payload?.error) {
      return payload.error
    }
  } else {
    await response.text().catch(() => '')
  }

  if (response.status === 401) {
    return 'Tu sesión ha caducado. Inicia sesión de nuevo para continuar.'
  }

  if (response.status === 404) {
    return 'El servidor de pagos no tiene disponible esta ruta. Revisa la configuración del backend.'
  }

  if (response.status >= 500) {
    return 'El servidor de pagos tuvo un problema. Inténtalo de nuevo en unos segundos.'
  }

  return fallbackMessage
}
