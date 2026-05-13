import { createClient } from '@supabase/supabase-js'

// Variables publicas de Vite. Solo usar anon key aqui; nunca service_role ni secretos privados.
const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Permite que la app muestre errores claros si falta configurar .env.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Cliente unico de Supabase para Auth y queries. Las reglas reales viven en RLS del backend.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

// En Supabase la URL publica del proyecto siempre debe ir por HTTPS.
// Esto evita errores de fetch si en .env se escribe http por accidente.
function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl) {
    return rawUrl
  }

  const trimmedUrl = String(rawUrl).trim().replace(/\/+$/, '')

  if (trimmedUrl.startsWith('http://') && trimmedUrl.includes('.supabase.co')) {
    return trimmedUrl.replace(/^http:\/\//, 'https://')
  }

  return trimmedUrl
}
