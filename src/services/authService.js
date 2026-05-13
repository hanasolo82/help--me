import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, validateEmail, validatePassword } from '../lib/security'

// URL a la que Supabase devuelve al usuario despues de OAuth.
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

// Crea usuario con email/password en Supabase Auth. No guardamos passwords en la app.
export async function signUpWithEmail({ email, password }) {
  assertSupabaseReady()
  const emailResult = validateEmail(email)
  const passwordResult = validatePassword(password)

  if (!emailResult.isValid) {
    throw new Error(emailResult.error)
  }

  if (!passwordResult.isValid) {
    throw new Error(passwordResult.error)
  }

  const { data, error } = await supabase.auth.signUp({
    email: emailResult.value,
    password: passwordResult.value,
  })

  if (error) {
    throw error
  }

  return data
}

// Inicia sesion con email/password usando Supabase Auth.
export async function signInWithEmail({ email, password }) {
  assertSupabaseReady()
  const emailResult = validateEmail(email)
  const passwordResult = validatePassword(password)

  if (!emailResult.isValid) {
    throw new Error(emailResult.error)
  }

  if (!passwordResult.isValid) {
    throw new Error(passwordResult.error)
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailResult.value,
    password: passwordResult.value,
  })

  if (error) {
    throw error
  }

  return data
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

// Lee la sesion persistida por Supabase en localStorage seguro del cliente.
export async function getCurrentSession() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    return null
  }

  return data.session
}

// Suscribe cambios de auth para mantener el contexto sincronizado.
export function onAuthStateChange(callback) {
  if (!supabase) {
    return { unsubscribe: () => {} }
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return data.subscription
}

// Cierra la sesion actual de Supabase.
export async function signOut() {
  assertSupabaseReady()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
