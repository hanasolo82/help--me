import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, validateEmail, validatePhone } from '../lib/security'

// URL a la que Supabase devuelve al usuario despues de OAuth o magic link.
const redirectTo = `${window.location.origin}/home`

// Inicia OAuth con Google. La redireccion la gestiona Supabase, no guardamos passwords.
export async function signInWithGoogle() {
  assertSupabaseReady()

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })

  if (error) {
    throw error
  }
}

// Envia un magic link al correo. shouldCreateUser permite registro y login sin password.
export async function sendEmailMagicLink(email) {
  assertSupabaseReady()
  const result = validateEmail(email)

  if (!result.isValid) {
    throw new Error(result.error)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: result.value,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  })

  if (error) {
    throw error
  }
}

// Envia un OTP al telefono para login/registro sin password manual.
export async function sendPhoneOtp(phone) {
  assertSupabaseReady()
  const result = validatePhone(phone)

  if (!result.isValid) {
    throw new Error(result.error)
  }

  const { error } = await supabase.auth.signInWithOtp({
    phone: result.value,
  })

  if (error) {
    throw error
  }
}

// Consulta la sesion real en Supabase. Se usa para proteger rutas y evitar modales innecesarios.
export async function getCurrentUser() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data.user
}

// Cierra la sesion actual de Supabase.
export async function signOut() {
  assertSupabaseReady()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
