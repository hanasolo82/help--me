import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'
import { cellSetToRows } from '../../availability/timeSlots'

const MAX_SKILLS = 6

async function resolveOwnedProfileId(profileId = null) {
  const user = await requireUser('Necesitas una sesion valida para editar tu perfil.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  return user.id
}

// Persiste la matriz de disponibilidad pública: una fila por celda marcada
// (día × franja, con el rango horario de la franja). No toca el servicio del
// onboarding (helperAvailabilityService), que sigue escribiendo días completos;
// ambos formatos se leen igual en la matriz (solape de rangos).
export async function replaceOwnAvailabilityCells(profileId, cells) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)
  const rows = cellSetToRows(cells)
  const now = new Date().toISOString()

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ availability_enabled: rows.length > 0, updated_at: now })
    .eq('id', ownedProfileId)

  if (profileError) {
    throw profileError
  }

  const { error: deleteError } = await supabase
    .from('profile_availability')
    .delete()
    .eq('profile_id', ownedProfileId)

  if (deleteError) {
    throw deleteError
  }

  if (rows.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('profile_availability')
    .insert(rows.map((row) => ({ ...row, profile_id: ownedProfileId, updated_at: now })))
    .select('profile_id, day_of_week, start_time, end_time, created_at, updated_at')

  if (error) {
    throw error
  }

  return data ?? []
}

// Persiste la lista de habilidades EN ORDEN de prioridad (definido por el
// ayudante). profile_skills no tiene columna de orden, pero el lector público
// (profileApi.getProfileSkills) ordena por years_experience desc — campo que
// hoy se escribe siempre a 0 y que ninguna UI muestra— así que se usa como
// peso: la primera skill recibe N-1, la última 0. Sin migraciones.
export async function replaceOwnSkillsOrdered(profileId, skillIds = []) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const ids = []
  for (const value of skillIds) {
    const skillId = typeof value === 'string' ? value : value?.skill?.id || value?.id || null
    if (skillId && !ids.includes(skillId)) ids.push(skillId)
  }
  const limited = ids.slice(0, MAX_SKILLS)

  const { error: deleteError } = await supabase
    .from('profile_skills')
    .delete()
    .eq('profile_id', ownedProfileId)

  if (deleteError) {
    throw deleteError
  }

  if (!limited.length) {
    return []
  }

  const rows = limited.map((skillId, index) => ({
    profile_id: ownedProfileId,
    skill_id: skillId,
    experience_level: 'beginner',
    years_experience: limited.length - 1 - index,
    is_primary: index === 0,
  }))

  const { data, error } = await supabase
    .from('profile_skills')
    .insert(rows)
    .select('profile_id, skill_id, is_primary, experience_level, years_experience, skill:skills(id, name, icon, category)')

  if (error) {
    throw error
  }

  return data ?? []
}

export { MAX_SKILLS }
