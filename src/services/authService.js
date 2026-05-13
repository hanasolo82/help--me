import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, validateEmail, validatePassword } from '../lib/security'

// URL a la que Supabase devuelve al usuario despues de OAuth.
const redirectTo = `${window.location.origin}/home`

// Inicia OAuth con Google. La redireccion la gestiona Supabase, no guardamos passwords.
export async function signInWithGoogle() {
  assertSupabaseReady()

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })

    if (error) {
      throw error
    }
  } catch (error) {
    throw normalizeAuthError(error)
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

  try {
    const { data, error } = await supabase.auth.signUp({
      email: emailResult.value,
      password: passwordResult.value,
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    throw normalizeAuthError(error)
  }
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

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailResult.value,
      password: passwordResult.value,
    })

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    throw normalizeAuthError(error)
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

function normalizeAuthError(error) {
  const message = String(error?.message || '')

  if (message.toLowerCase().includes('failed to fetch') || error instanceof TypeError) {
    return new Error(
      'No se pudo conectar con Supabase. Revisa VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY y reinicia Vite.',
    )
  }

  return error instanceof Error ? error : new Error('Ha ocurrido un error de autenticacion.')
}
