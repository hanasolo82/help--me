function getConfiguredBackendUrl() {
  const value = import.meta.env.VITE_API_URL

  if (typeof value === 'string' && value.trim()) {
    return value.trim().replace(/\/+$/, '')
  }

  return ''
}

export const MISSING_BACKEND_URL_ERROR =
  'Falta configurar VITE_API_URL con la URL pública del servidor de pagos.'

export function getBackendBaseUrl() {
  const configuredUrl = getConfiguredBackendUrl()

  if (configuredUrl) {
    return configuredUrl
  }

  return ''
}

export function buildBackendUrl(path) {
  const baseUrl = getBackendBaseUrl()

  if (!baseUrl) {
    throw new Error(MISSING_BACKEND_URL_ERROR)
  }

  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
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
