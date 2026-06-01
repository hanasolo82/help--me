import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, validateEmail, validatePassword } from '../lib/security'
import { clearRememberedEmail, rememberEmail } from '../lib/consent'
import { clearClientSessionState } from './sessionCleanup'

// URLs publicas para callbacks de Supabase. Solo deben coincidir con la allow-list
// configurada en Supabase Auth > URL Configuration para evitar open redirect.
const redirectTo = `${window.location.origin}/auth/callback`
const resetRedirectTo = `${window.location.origin}/reset-password`

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
export async function signUpWithEmail({ email, password, captchaToken }) {
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
      options: { emailRedirectTo: redirectTo, captchaToken },
    })

    if (error) {
      throw error
    }

    // Guardamos el email para que al volver al modal solo aparezca el campo password.
    rememberEmail(emailResult.value)
    return data
  } catch (error) {
    throw normalizeAuthError(error, { context: 'signup' })
  }
}

// Inicia sesion con email/password usando Supabase Auth.
export async function signInWithEmail({ email, password, captchaToken }) {
  assertSupabaseReady()
  const emailResult = validateEmail(email)

  if (!emailResult.isValid) {
    // No revelamos si el formato es invalido vs si el email no existe.
    throw new Error('Credenciales invalidas.')
  }

  // En signIn no aplicamos la politica fuerte; solo verificamos que haya algo.
  if (!password || password.length < 8) {
    throw new Error('Credenciales invalidas.')
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailResult.value,
      password,
      options: { captchaToken },
    })

    if (error) {
      throw error
    }

    rememberEmail(emailResult.value)
    return data
  } catch (error) {
    throw normalizeAuthError(error, { context: 'signin' })
  }
}

// Pide email de reset. Siempre devuelve ok aunque el email no exista (anti-enumeration).
export async function requestPasswordReset(email, { captchaToken } = {}) {
  assertSupabaseReady()
  const emailResult = validateEmail(email)
  if (!emailResult.isValid) {
    // No revelamos. UX igual: "si el correo es valido recibiras instrucciones".
    return { ok: true }
  }

  try {
    await supabase.auth.resetPasswordForEmail(emailResult.value, {
      redirectTo: resetRedirectTo,
      captchaToken,
    })
  } catch {
    // Tragamos el error a proposito para no permitir enumeration via timing/errores.
  }

  return { ok: true }
}

// Actualiza la password del usuario actual. Requiere sesion activa (recovery o login).
export async function updatePassword(newPassword) {
  assertSupabaseReady()
  const passwordResult = validatePassword(newPassword)
  if (!passwordResult.isValid) {
    throw new Error(passwordResult.error)
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: passwordResult.value })
    if (error) throw error
  } catch (error) {
    throw normalizeAuthError(error)
  }
}

// Reenvia el correo de confirmacion de signup si el usuario no lo recibio o lo perdio.
export async function resendSignupConfirmation(email) {
  assertSupabaseReady()
  const emailResult = validateEmail(email)
  if (!emailResult.isValid) {
    return { ok: true }
  }

  try {
    await supabase.auth.resend({
      type: 'signup',
      email: emailResult.value,
      options: { emailRedirectTo: redirectTo },
    })
  } catch {
    // Misma logica anti-enumeration que requestPasswordReset.
  }

  return { ok: true }
}

// getUser hace round-trip al server y valida la firma del JWT. Usar en bootstrap.
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

// Lee la sesion persistida por Supabase (solo localStorage, sin validar firma).
// Util para reactividad rapida; NO usar como unica fuente de verdad de seguridad.
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

// Cierra la sesion.
// scope='local' borra solo esta sesion del navegador actual.
// scope='global' invalida TODAS las sesiones del usuario (todos los dispositivos).
// Este es el sitio exacto donde debes llamar si quieres un "cierre definitivo".
export async function signOut({ scope = 'local' } = {}) {
  assertSupabaseReady()
  const { error } = await supabase.auth.signOut({ scope })

  if (error) {
    throw error
  }

  // Al cerrar sesion conscientemente, olvidamos el email recordado para evitar mezclar cuentas
  // en dispositivos compartidos.
  clearRememberedEmail()
  clearClientSessionState()
}

function normalizeAuthError(error, { context } = {}) {
  const message = String(error?.message || '')
  const normalizedMessage = message.toLowerCase()

  if (normalizedMessage.includes('apikey') || normalizedMessage.includes('api key')) {
    return new Error(
      'Supabase rechazo la API key. Revisa VITE_SUPABASE_ANON_KEY en .env y reinicia Vite para recargar variables.',
    )
  }

  if (normalizedMessage.includes('failed to fetch') || error instanceof TypeError) {
    return new Error(
      'No se pudo conectar con Supabase. Revisa VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY y reinicia Vite.',
    )
  }

  // Anti-enumeration: en signIn devolvemos siempre el mismo mensaje generico,
  // sin diferenciar "usuario no existe" vs "password incorrecta" vs "email no confirmado".
  if (context === 'signin') {
    if (normalizedMessage.includes('email not confirmed')) {
      return new Error('Confirma tu correo antes de entrar. Revisa tu bandeja o reenvia el email.')
    }
    return new Error('Credenciales invalidas.')
  }

  // En signup, si el usuario ya existe Supabase puede devolver "User already registered".
  // Marcamos el caso de forma distinguible para que el formulario lo refleje en el input
  // de email, pero seguimos evitando exponer detalles innecesarios en el resto de errores.
  if (context === 'signup' && normalizedMessage.includes('already registered')) {
    const takenError = new Error('Ese correo ya está registrado. Inicia sesión o usa otro.')
    takenError.code = 'email_taken'
    return takenError
  }

  return error instanceof Error ? error : new Error('Ha ocurrido un error de autenticacion.')
}
