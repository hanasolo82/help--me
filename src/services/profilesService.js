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

// Crea el profile obligatorio para el usuario autenticado.
export async function createProfile(userId, input) {
  assertSupabaseReady()
  const validation = validateProfileInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
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
