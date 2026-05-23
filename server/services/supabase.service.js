import { createClient } from '@supabase/supabase-js'
import { loadServerEnv } from '../config/env.js'

let cachedAdminClient = null

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value)
}

function createAdminClient() {
  const { env } = loadServerEnv()

  if (!isHttpUrl(env.SUPABASE_URL) || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
}

export function getSupabaseAdmin() {
  if (!cachedAdminClient) {
    cachedAdminClient = createAdminClient()
  }

  return cachedAdminClient
}

export const supabaseAdmin = getSupabaseAdmin()

export async function getUserFromAuthHeader(authHeader) {
  const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''

  if (!token) {
    return {
      user: null,
      error: new Error('Missing Bearer token.'),
    }
  }

  const admin = getSupabaseAdmin()

  if (!admin) {
    return {
      user: null,
      error: new Error('Supabase admin client is not configured.'),
    }
  }

  const { data, error } = await admin.auth.getUser(token)

  if (error || !data?.user) {
    return {
      user: null,
      error: error || new Error('Unauthorized.'),
    }
  }

  return {
    user: data.user,
    error: null,
  }
}
