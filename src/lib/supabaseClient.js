import { createClient } from '@supabase/supabase-js'

// Variables publicas de Vite. Solo usar anon key aqui; nunca service_role ni secretos privados.
const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = normalizeSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY)

// Permite que la app muestre errores claros si falta configurar .env.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// Cliente unico de Supabase para Auth y queries. Las reglas reales viven en RLS del backend.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Aqui se controla la persistencia de la sesion del usuario en el navegador.
        // `persistSession: true` => Supabase guarda la sesion en localStorage.
        // El "tiempo" real no se define aqui: lo marca la caducidad de la sesion/JWT en Supabase Auth.
        // Si quieres cambiar expiracion o sesiones globales, hazlo en la configuracion de Supabase Auth.
        // PKCE evita interception del code en redirecciones OAuth/recover en SPAs.
        flowType: 'pkce',
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

// La anon key suele venir copiada/pegada desde el dashboard. Aqui quitamos espacios o saltos accidentales.
function normalizeSupabaseAnonKey(rawKey) {
  if (!rawKey) {
    return rawKey
  }

  return String(rawKey).trim()
}
