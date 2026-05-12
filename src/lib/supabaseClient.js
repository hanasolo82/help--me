import { createClient } from '@supabase/supabase-js'

// Variables publicas de Vite. Solo usar anon key aqui; nunca service_role ni secretos privados.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
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
