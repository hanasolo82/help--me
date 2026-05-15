import { supabase } from './supabaseClient'
import { assertSupabaseReady } from './security'

// Recupera el usuario autenticado actual o lanza un error legible.
// Centraliza la combinacion repetida en services: assertSupabaseReady + getUser + null-check.
// El mensaje admite override por dominio (publicar tarea, enviar mensaje, subir imagen...)
// para que el componente pueda mostrarlo tal cual en pantalla.
export async function requireUser(message = 'Necesitas iniciar sesion.') {
  assertSupabaseReady()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    throw new Error(message)
  }

  return data.user
}

// Variante no lanzante: devuelve el user o null. Util en queries publicas donde
// queremos personalizar los resultados si hay sesion pero no fallar si no la hay.
export async function currentUser() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase.auth.getUser()

  if (error) {
    return null
  }

  return data?.user || null
}
