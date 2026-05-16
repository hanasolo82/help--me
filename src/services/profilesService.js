import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText, validateUsername } from '../lib/security'
import { requireUser } from '../lib/authHelpers'
import { DEFAULT_PALETTE, isValidPalettePrimary } from '../lib/palettes'
import { uploadAvatar } from './storageService'

const DEFAULT_THEME = 'light'
const DEFAULT_ACCENT_COLOR = DEFAULT_PALETTE.primary
const DEFAULT_SEARCH_RADIUS_KM = 10

function normalizeTheme(theme) {
  return theme === 'dark' ? 'dark' : DEFAULT_THEME
}

function normalizeAccentColor(accentColor) {
  const value = sanitizeText(accentColor, 7).toLowerCase()
  return isValidPalettePrimary(value) ? value : DEFAULT_ACCENT_COLOR
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
  const base = normalizeSlug(metadataName) || 'usuario'
  const suffix = (user?.id || String(Date.now())).replace(/-/g, '').slice(0, 8 + attempt)
  const variant = attempt > 0 ? `${suffix}${attempt.toString(36)}` : suffix
  const candidate = validateUsername(`${base}_${variant}`.slice(0, 30))
  if (candidate.isValid) {
    return candidate.value
  }

  return validateUsername(`usuario_${variant}`.slice(0, 30)).value
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
    rating: 0,
    completed_tasks: 0,
    verified: false,
    account_status: 'active',
    theme: DEFAULT_THEME,
    accent_color: DEFAULT_ACCENT_COLOR,
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
  const usernameResult = validateUsername(input.username)
  const displayName = buildDisplayName(input)
  const neighborhood = buildLegacyNeighborhood(input)
  const avatarUrl = sanitizeText(input.avatarUrl, 500)
  const errors = []

  if (!usernameResult.isValid) errors.push(usernameResult.error)
  if (displayName.length < 2) errors.push('El nombre debe tener al menos 2 caracteres.')
  if (neighborhood.length < 2) errors.push('El barrio o zona debe tener al menos 2 caracteres.')

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      username: usernameResult.value,
      display_name: displayName,
      full_name: displayName,
      neighborhood,
      avatar_url: avatarUrl || null,
      map_avatar_url: null,
      bio: sanitizeText(input.bio, 160) || null,
      theme: normalizeTheme(input.theme),
      accent_color: normalizeAccentColor(input.accentColor),
      search_radius_km: normalizeInteger(input.searchRadiusKm, DEFAULT_SEARCH_RADIUS_KM, { min: 1, max: 100 }),
      show_approx_location: normalizeBoolean(input.showApproxLocation, true),
      notify_nearby_tasks: normalizeBoolean(input.notifyNearbyTasks, true),
      notify_messages: normalizeBoolean(input.notifyMessages, true),
      notify_payments: normalizeBoolean(input.notifyPayments, true),
      account_status: 'active',
    },
  }
}

// Crea el profile obligatorio usando SIEMPRE el id real del usuario autenticado en Supabase.
export async function createProfile(input) {
  const validation = validateProfileInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const user = await requireUser('Necesitas una sesion valida para crear tu profile.')

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      ...validation.value,
    })
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

  if (Object.prototype.hasOwnProperty.call(input, 'theme')) {
    updates.theme = normalizeTheme(input.theme)
  }

  if (Object.prototype.hasOwnProperty.call(input, 'accentColor')) {
    updates.accent_color = normalizeAccentColor(input.accentColor)
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
