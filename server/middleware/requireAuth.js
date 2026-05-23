import { createClient } from '@supabase/supabase-js'
import { loadServerEnv } from '../config/env.js'

let supabaseClient = null

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const { env } = loadServerEnv()
  if (!env.SUPABASE_URL || !/^https?:\/\//i.test(env.SUPABASE_URL)) {
    return null
  }

  if (!env.SUPABASE_ANON_KEY) {
    return null
  }

  supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })

  return supabaseClient
}

export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!token) {
    return res.status(401).json({
      error: 'Missing Bearer token.',
    })
  }

  const supabase = getSupabaseClient()

  if (!supabase) {
    return res.status(503).json({
      error: 'Supabase auth is not configured on the server.',
    })
  }

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return res.status(401).json({
      error: 'Invalid or expired session.',
    })
  }

  req.auth = {
    token,
    user: data.user,
  }

  return next()
}
