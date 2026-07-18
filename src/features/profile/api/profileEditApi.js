import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'
import { cellSetToRows } from '../../availability/timeSlots'
import { MAX_PROFILE_SKILLS, normalizeSkillName } from '../../skills/config/skillCategories'

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

function toSkillPayload(entry) {
  const skill = entry?.skill || entry

  if (skill?.source === 'custom' || skill?.is_custom === true) {
    return {
      source: 'custom',
      name: normalizeSkillName(skill.name),
      category: String(skill.category || '').trim(),
    }
  }

  const skillId = typeof skill === 'string' ? skill : skill?.id || null
  return skillId ? { source: 'catalog', id: skillId } : null
}

// Sustituye sugeridas y propias en una sola transacción. La RPC aplica
// ownership, límites, categorías y deduplicación aunque el cliente se modifique.
export async function replaceOwnSkillsOrdered(profileId, skills = []) {
  await resolveOwnedProfileId(profileId)

  const items = skills
    .map(toSkillPayload)
    .filter(Boolean)
    .slice(0, MAX_PROFILE_SKILLS)

  const { error } = await supabase.rpc('replace_own_profile_skills', {
    p_items: items,
  })

  if (error) {
    throw error
  }

  return items
}

export { MAX_PROFILE_SKILLS as MAX_SKILLS }
