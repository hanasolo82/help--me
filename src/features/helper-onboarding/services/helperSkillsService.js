import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'
import { MAX_PROFILE_SKILLS } from '../../skills/config/skillCategories'

async function resolveOwnedProfileId(profileId = null) {
  const user = await requireUser('Necesitas una sesion valida para gestionar tus habilidades.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  return user.id
}

function normalizeSelectedSkillIds(selectedSkills = []) {
  const ids = []

  for (const entry of selectedSkills) {
    const skillId =
      typeof entry === 'string'
        ? entry
        : entry?.skill_id || entry?.id || entry?.skill?.id || null

    if (skillId && !ids.includes(skillId)) {
      ids.push(skillId)
    }
  }

  return ids.slice(0, MAX_PROFILE_SKILLS)
}

export async function getActiveSkills() {
  // TODO: cuando exista task_skills, usaremos estas skills para el matching helper <-> task.
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, icon, category, sort_order, is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getProfileSkills(profileId) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const { data, error } = await supabase
    .from('profile_skills')
    .select('profile_id, skill_id, is_primary, experience_level, years_experience, sort_order, skill:skills(id, name, icon, category, sort_order)')
    .eq('profile_id', ownedProfileId)
    .order('sort_order', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function replaceProfileSkills(profileId, selectedSkills = []) {
  await resolveOwnedProfileId(profileId)

  // TODO: el requester filtrará helpers por skills compatibles cuando el matching de tareas esté listo.
  const skillIds = normalizeSelectedSkillIds(selectedSkills)

  const { error } = await supabase.rpc('replace_own_catalog_skills', {
    p_skill_ids: skillIds,
  })

  if (error) {
    throw error
  }

  return getProfileSkills(profileId)
}
