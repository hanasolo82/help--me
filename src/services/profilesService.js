import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText, validateUsername } from '../lib/security'
import { requireUser } from '../lib/authHelpers'
import { uploadAvatar } from './storageService'

const DEFAULT_THEME = 'light'
const DEFAULT_SEARCH_RADIUS_KM = 10
const DEFAULT_HELPER_ENABLED = false
const DEFAULT_AVAILABILITY_ENABLED = true
const DEFAULT_HELPER_STATUS = 'not_started'
const ALLOWED_HELPER_STATUSES = new Set([
  'not_started',
  'profile_incomplete',
  'contact_pending',
  'identity_pending',
  'terms_pending',
  'under_review',
  'active',
  'rejected',
  'suspended',
])

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : DEFAULT_THEME
}

function normalizeHelperStatus(value) {
  const nextValue = sanitizeText(value, 40) || DEFAULT_HELPER_STATUS
  if (nextValue === 'active') {
    return 'under_review'
  }

  return ALLOWED_HELPER_STATUSES.has(nextValue) ? nextValue : DEFAULT_HELPER_STATUS
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (value === 'true' || value === '1') return true
  if (value === 'false' || value === '0') return false
  return fallback
}

function normalizeInteger(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed)) return fallback

  return Math.min(max, Math.max(min, parsed))
}

function normalizeDecimal(value, fallback = null, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  if (value === null || value === undefined || value === '') return fallback

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback

  return Math.min(max, Math.max(min, parsed))
}

function buildDisplayName(input) {
  return sanitizeText(input.displayName ?? input.fullName, 80)
}

function buildLegacyNeighborhood(input) {
  return sanitizeText(input.neighborhood, 80)
}

function normalizeSlug(value) {
  return sanitizeText(value, 30)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildUsernameStamp(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${hours}${minutes}${seconds}`
}

function buildRandomDigits(length = 5) {
  const max = 10 ** length
  return String(Math.floor(Math.random() * max)).padStart(length, '0')
}

function buildAutoUsernameFromName(rawName, attempt = 0) {
  const base = normalizeSlug(rawName || 'usuario') || 'usuario'
  const stamp = buildUsernameStamp()
  const random = buildRandomDigits(5)
  const attemptSuffix = attempt > 0 ? `_${attempt.toString(36)}` : ''
  const maxBaseLength = Math.max(1, 30 - stamp.length - random.length - attemptSuffix.length - 3)
  const trimmedBase = base.slice(0, maxBaseLength) || 'usuario'
  const candidate = `${trimmedBase}_${stamp}_${random}${attemptSuffix}`.slice(0, 30)
  return validateUsername(candidate).value
}

function buildDisplayNameFromUser(user) {
  const rawName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.preferred_username ||
    user?.email?.split('@')?.[0] ||
    'Vecino'

  return sanitizeText(rawName, 80) || 'Vecino'
}

function buildNeighborhoodFromUser(user) {
  return (
    sanitizeText(user?.user_metadata?.location || user?.user_metadata?.city || user?.user_metadata?.neighborhood, 80) ||
    'Mi barrio'
  )
}

function buildUsernameFromUser(user, attempt = 0) {
  const metadataName =
    user?.user_metadata?.username ||
    user?.user_metadata?.preferred_username ||
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')?.[0] ||
    'usuario'
  return buildAutoUsernameFromName(metadataName, attempt)
}

function buildDefaultProfileValues(user, attempt = 0) {
  const displayName = buildDisplayNameFromUser(user)
  return {
    username: buildUsernameFromUser(user, attempt),
    display_name: displayName,
    full_name: displayName,
    bio: null,
    avatar_url: sanitizeText(user?.user_metadata?.avatar_url || user?.user_metadata?.picture, 500) || null,
    map_avatar_url: null,
    neighborhood: buildNeighborhoodFromUser(user),
    city: sanitizeText(user?.user_metadata?.city, 80) || null,
    country: sanitizeText(user?.user_metadata?.country, 80) || null,
    lat: null,
    lng: null,
    rating: 0,
    completed_tasks: 0,
    reviews_count: 0,
    response_time_minutes: null,
    helper_enabled: DEFAULT_HELPER_ENABLED,
    helper_status: DEFAULT_HELPER_STATUS,
    availability_enabled: DEFAULT_AVAILABILITY_ENABLED,
    hourly_rate: null,
    verified: false,
    verified_email: false,
    verified_phone: false,
    verified_identity: false,
    identity_verified: false,
    stripe_onboarding_completed: false,
    stripe_account_id: null,
    stripe_charges_enabled: false,
    stripe_payouts_enabled: false,
    account_status: 'active',
    theme: DEFAULT_THEME,
    search_radius_km: DEFAULT_SEARCH_RADIUS_KM,
    show_approx_location: true,
    notify_nearby_tasks: true,
    notify_messages: true,
    notify_payments: true,
  }
}

export function getProfileDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

// Lee el profile desacoplado de auth.users. Si no existe, onboarding debe crearlo.
export async function getProfileByUserId(userId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Lee el profile del usuario autenticado actual. Es la forma mas segura de consultar "mi profile".
export async function getCurrentProfile() {
  const user = await requireUser('No hay una sesion valida para leer el profile.')
  return getProfileByUserId(user.id)
}

// Garantiza que exista un profile para el usuario actual. Si falta, lo crea con valores seguros.
export async function ensureCurrentProfile() {
  const user = await requireUser('Necesitas una sesion valida para leer o crear tu profile.')
  const existingProfile = await getProfileByUserId(user.id)

  if (existingProfile) {
    return existingProfile
  }

  const defaultProfileValues = buildDefaultProfileValues(user)

  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        ...defaultProfileValues,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    if (error?.code === '23505') {
      const retryProfile = await getProfileByUserId(user.id)
      if (retryProfile) {
        return retryProfile
      }

      const fallbackProfileValues = buildDefaultProfileValues(user, 1)
      const { data, error: retryError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          ...fallbackProfileValues,
        })
        .select()
        .single()

      if (retryError) {
        throw retryError
      }

      return data
    }

    throw error
  }
}

// Da de baja el profile sin borrar datos historicos. Las tareas quedan guardadas,
// pero dejan de mostrarse como disponibles al estar el creador en unavailable.
export async function deactivateCurrentProfile() {
  const user = await requireUser('Necesitas una sesion valida para dar de baja el profile.')

  const { data, error } = await supabase
    .from('profiles')
    .update({
      account_status: 'unavailable',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

// Valida datos del onboarding antes de escribir en Supabase.
export function validateProfileInput(input) {
  const displayName = buildDisplayName(input)
  const neighborhood = buildLegacyNeighborhood(input)
  const avatarUrl = sanitizeText(input.avatarUrl, 500)
  const errors = []
  const usernameResult = input.username?.trim()
    ? validateUsername(input.username)
    : { isValid: true, value: buildAutoUsernameFromName(displayName) }

  if (displayName.length < 2) errors.push('El nombre debe tener al menos 2 caracteres.')
  if (neighborhood.length < 2) errors.push('El barrio o zona debe tener al menos 2 caracteres.')
  if (!usernameResult.isValid) errors.push(usernameResult.error)

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      username: usernameResult.value,
      display_name: displayName,
      full_name: displayName,
      neighborhood,
      city: sanitizeText(input.city, 80) || null,
      country: sanitizeText(input.country, 80) || null,
      lat: normalizeDecimal(input.lat, null, { min: -90, max: 90 }),
      lng: normalizeDecimal(input.lng, null, { min: -180, max: 180 }),
      avatar_url: avatarUrl || null,
      map_avatar_url: null,
      bio: sanitizeText(input.bio, 160) || null,
      theme: normalizeTheme(input.theme),
      search_radius_km: normalizeInteger(input.searchRadiusKm, DEFAULT_SEARCH_RADIUS_KM, { min: 1, max: 100 }),
      show_approx_location: normalizeBoolean(input.showApproxLocation, true),
      notify_nearby_tasks: normalizeBoolean(input.notifyNearbyTasks, true),
      notify_messages: normalizeBoolean(input.notifyMessages, true),
      notify_payments: normalizeBoolean(input.notifyPayments, true),
      helper_enabled: normalizeBoolean(input.helperEnabled, DEFAULT_HELPER_ENABLED),
      helper_status: normalizeHelperStatus(input.helperStatus),
      availability_enabled: normalizeBoolean(input.availabilityEnabled, DEFAULT_AVAILABILITY_ENABLED),
      response_time_minutes: normalizeInteger(input.responseTimeMinutes, null, { min: 1, max: 1440 }),
      hourly_rate: normalizeDecimal(input.hourlyRate, null, { min: 0, max: 9999 }),
      verified_email: normalizeBoolean(input.verifiedEmail, false),
      verified_phone: normalizeBoolean(input.verifiedPhone, false),
      verified_identity: normalizeBoolean(input.verifiedIdentity, false),
      identity_verified: normalizeBoolean(input.identityVerified, false),
      stripe_onboarding_completed: normalizeBoolean(input.stripeOnboardingCompleted, false),
      stripe_account_id: sanitizeText(input.stripeAccountId, 120) || null,
      stripe_charges_enabled: normalizeBoolean(input.stripeChargesEnabled, false),
      stripe_payouts_enabled: normalizeBoolean(input.stripePayoutsEnabled, false),
      account_status: 'active',
    },
  }
}

// Crea el profile obligatorio usando SIEMPRE el id real del usuario autenticado en Supabase.
export async function createProfile(input) {
  const validation = validateProfileInput(input)

  const user = await requireUser('Necesitas una sesion valida para crear tu profile.')

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const hasManualUsername = Boolean(input.username?.trim())

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidateUsername = hasManualUsername
      ? validation.value.username
      : buildAutoUsernameFromName(validation.value.display_name, attempt)

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        ...validation.value,
        username: candidateUsername,
      })
      .select()
      .single()

    if (!error) {
      return data
    }

    if (error.code !== '23505' || hasManualUsername || attempt === 2) {
      if (error.code === '23505') {
        throw new Error('Ese username ya esta en uso.')
      }

      throw error
    }
  }

  throw new Error('No pudimos generar un username unico. Intentalo otra vez.')
}

function normalizeProfileUpdateInput(input) {
  const updates = {}

  if (Object.prototype.hasOwnProperty.call(input, 'displayName') || Object.prototype.hasOwnProperty.call(input, 'fullName')) {
    const displayName = buildDisplayName(input)
    if (displayName.length < 2) {
      throw new Error('El nombre debe tener al menos 2 caracteres.')
    }
    updates.display_name = displayName
    updates.full_name = displayName
  }

  if (Object.prototype.hasOwnProperty.call(input, 'username')) {
    const usernameResult = validateUsername(input.username)
    if (!usernameResult.isValid) {
      throw new Error(usernameResult.error)
    }
    updates.username = usernameResult.value
  }

  if (Object.prototype.hasOwnProperty.call(input, 'bio')) {
    updates.bio = sanitizeText(input.bio, 160) || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'city')) {
    updates.city = sanitizeText(input.city, 80) || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'country')) {
    updates.country = sanitizeText(input.country, 80) || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'lat')) {
    updates.lat = normalizeDecimal(input.lat, null, { min: -90, max: 90 })
  }

  if (Object.prototype.hasOwnProperty.call(input, 'lng')) {
    updates.lng = normalizeDecimal(input.lng, null, { min: -180, max: 180 })
  }

  if (Object.prototype.hasOwnProperty.call(input, 'theme')) {
    updates.theme = normalizeTheme(input.theme)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'searchRadiusKm')) {
    updates.search_radius_km = normalizeInteger(input.searchRadiusKm, DEFAULT_SEARCH_RADIUS_KM, { min: 1, max: 100 })
  }

  if (Object.prototype.hasOwnProperty.call(input, 'showApproxLocation')) {
    updates.show_approx_location = normalizeBoolean(input.showApproxLocation, true)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'notifyNearbyTasks')) {
    updates.notify_nearby_tasks = normalizeBoolean(input.notifyNearbyTasks, true)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'notifyMessages')) {
    updates.notify_messages = normalizeBoolean(input.notifyMessages, true)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'notifyPayments')) {
    updates.notify_payments = normalizeBoolean(input.notifyPayments, true)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'helperEnabled')) {
    updates.helper_enabled = normalizeBoolean(input.helperEnabled, DEFAULT_HELPER_ENABLED)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'helperStatus')) {
    updates.helper_status = normalizeHelperStatus(input.helperStatus)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'availabilityEnabled')) {
    updates.availability_enabled = normalizeBoolean(input.availabilityEnabled, DEFAULT_AVAILABILITY_ENABLED)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'visibilityEnabled')) {
    updates.availability_enabled = normalizeBoolean(input.visibilityEnabled, DEFAULT_AVAILABILITY_ENABLED)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'responseTimeMinutes')) {
    updates.response_time_minutes = normalizeInteger(input.responseTimeMinutes, null, { min: 1, max: 1440 })
  }

  if (Object.prototype.hasOwnProperty.call(input, 'hourlyRate')) {
    updates.hourly_rate = normalizeDecimal(input.hourlyRate, null, { min: 0, max: 9999 })
  }

  if (Object.prototype.hasOwnProperty.call(input, 'verifiedEmail')) {
    updates.verified_email = normalizeBoolean(input.verifiedEmail, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'verifiedPhone')) {
    updates.verified_phone = normalizeBoolean(input.verifiedPhone, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'verifiedIdentity')) {
    updates.verified_identity = normalizeBoolean(input.verifiedIdentity, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'identityVerified')) {
    updates.identity_verified = normalizeBoolean(input.identityVerified, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'stripeOnboardingCompleted')) {
    updates.stripe_onboarding_completed = normalizeBoolean(input.stripeOnboardingCompleted, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'stripeAccountId')) {
    updates.stripe_account_id = sanitizeText(input.stripeAccountId, 120) || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'stripeChargesEnabled')) {
    updates.stripe_charges_enabled = normalizeBoolean(input.stripeChargesEnabled, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'stripePayoutsEnabled')) {
    updates.stripe_payouts_enabled = normalizeBoolean(input.stripePayoutsEnabled, false)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'avatarUrl')) {
    updates.avatar_url = sanitizeText(input.avatarUrl, 500) || null
  }

  if (Object.prototype.hasOwnProperty.call(input, 'mapAvatarUrl')) {
    updates.map_avatar_url = sanitizeText(input.mapAvatarUrl, 500) || null
  }

  return updates
}

// Actualiza el profile actual con preferencias de perfil, apariencia, mapa y notificaciones.
// El avatar de mapa NO se sube: se elige por id del catalogo predefinido y entra por mapAvatarUrl
// (ver normalizeProfileUpdateInput). Solo el avatar de perfil se sube como archivo.
export async function updateCurrentProfile(input) {
  const user = await requireUser('Necesitas una sesion valida para actualizar tu profile.')
  await ensureCurrentProfile()
  const updates = normalizeProfileUpdateInput(input)

  if (input.avatarFile) {
    const uploaded = await uploadAvatar(input.avatarFile)
    updates.avatar_url = uploaded.publicUrl
  }

  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ese username ya esta en uso.')
    }

    throw error
  }

  return data
}
