import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText, validateUsername } from '../lib/security'

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
  assertSupabaseReady()

  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('No hay una sesion valida para leer el profile.')
  }

  return getProfileByUserId(authData.user.id)
}

// Da de baja el profile sin borrar datos historicos. Las tareas quedan guardadas,
// pero dejan de mostrarse como disponibles al estar el creador en unavailable.
export async function deactivateCurrentProfile() {
  assertSupabaseReady()

  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('Necesitas una sesion valida para dar de baja el profile.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      account_status: 'unavailable',
      updated_at: new Date().toISOString(),
    })
    .eq('id', authData.user.id)
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
  const fullName = sanitizeText(input.fullName, 80)
  const neighborhood = sanitizeText(input.neighborhood, 80)
  const avatarUrl = sanitizeText(input.avatarUrl, 500)
  const errors = []

  if (!usernameResult.isValid) errors.push(usernameResult.error)
  if (fullName.length < 2) errors.push('El nombre debe tener al menos 2 caracteres.')
  if (neighborhood.length < 2) errors.push('El barrio o zona debe tener al menos 2 caracteres.')

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      username: usernameResult.value,
      full_name: fullName,
      neighborhood,
      avatar_url: avatarUrl || null,
    },
  }
}

// Crea el profile obligatorio usando SIEMPRE el id real del usuario autenticado en Supabase.
export async function createProfile(input) {
  assertSupabaseReady()
  const validation = validateProfileInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('Necesitas una sesion valida para crear tu profile.')
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
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
