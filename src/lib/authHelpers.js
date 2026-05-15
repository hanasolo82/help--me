import { supabase } from './supabaseClient'
import { assertSupabaseReady } from './security'

// Lanza si no hay sesion valida. El mensaje permite contextualizar la accion bloqueada
// (publicar tarea, enviar mensaje, etc.) para que el componente lo muestre tal cual.
export async function requireUser(message = 'Necesitas iniciar sesion.') {
  assertSupabaseReady()

  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    throw new Error(message)
  }

  return data.user
}
