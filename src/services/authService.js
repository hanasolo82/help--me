import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, validateEmail, validatePhone } from '../lib/security'

const redirectTo = `${window.location.origin}/home`

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

export async function signOut() {
  assertSupabaseReady()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw error
  }
}
