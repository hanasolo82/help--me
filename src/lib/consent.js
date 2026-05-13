// Helpers para consentimiento de cookies y email recordado.
// Mantener aislado de Supabase: estos datos NO viajan al servidor.

const CONSENT_KEY = 'helpme-consent-v1'
const REMEMBERED_EMAIL_KEY = 'helpme-last-email'

export const CONSENT_VERSION = 1

// Categorias de consentimiento. "necessary" siempre va a true; las demas requieren accion.
const DEFAULT_CONSENT = Object.freeze({
  version: CONSENT_VERSION,
  decidedAt: null,
  necessary: true,
  preferences: false,
  analytics: false,
})

function safeParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// Lee el consentimiento actual. Devuelve defaults si no hay decision o si la version cambio.
export function readConsent() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONSENT }
  const raw = localStorage.getItem(CONSENT_KEY)
  const parsed = raw ? safeParse(raw) : null

  if (!parsed || parsed.version !== CONSENT_VERSION) {
    return { ...DEFAULT_CONSENT }
  }

  return {
    ...DEFAULT_CONSENT,
    ...parsed,
    necessary: true,
  }
}

// Persiste el consentimiento. Fuerza necessary=true y anade timestamp.
export function writeConsent(consent) {
  if (typeof window === 'undefined') return
  const next = {
    ...DEFAULT_CONSENT,
    ...consent,
    necessary: true,
    version: CONSENT_VERSION,
    decidedAt: new Date().toISOString(),
  }
  localStorage.setItem(CONSENT_KEY, JSON.stringify(next))
  return next
}

// Indica si el usuario ya tomo una decision (banner se debe ocultar).
export function hasDecidedConsent() {
  const consent = readConsent()
  return Boolean(consent.decidedAt)
}

// Limpia el consentimiento. Util para pantallas "revisar mis preferencias".
export function resetConsent() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_KEY)
}

// Email recordado: NO incluye la password. Solo facilita escribir menos al volver.
// Se borra explicitamente al pulsar "Usar otra cuenta" o al hacer logout (ver authService).
export function rememberEmail(email) {
  if (typeof window === 'undefined' || !email) return
  const clean = String(email).trim().toLowerCase()
  if (!clean) return
  localStorage.setItem(REMEMBERED_EMAIL_KEY, clean)
}

export function readRememberedEmail() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(REMEMBERED_EMAIL_KEY) || ''
}

export function clearRememberedEmail() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_EMAIL_KEY)
}
