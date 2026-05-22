import { supabase } from '../../../lib/supabaseClient'

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

  return ids.slice(0, 6)
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

export async function replaceProfileSkills(profileId, selectedSkills = []) {
  if (!profileId) {
    throw new Error('No pudimos guardar las skills porque falta el profile.')
  }

  // TODO: el requester filtrará helpers por skills compatibles cuando el matching de tareas esté listo.
  const skillIds = normalizeSelectedSkillIds(selectedSkills)

  const { error: deleteError } = await supabase
    .from('profile_skills')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) {
    throw deleteError
  }

  if (!skillIds.length) {
    return []
  }

  const rows = skillIds.map((skillId, index) => ({
    profile_id: profileId,
    skill_id: skillId,
    experience_level: 'beginner',
    years_experience: 0,
    is_primary: index === 0,
  }))

  const { data, error } = await supabase
    .from('profile_skills')
    .insert(rows)
    .select('profile_id, skill_id, is_primary, experience_level, years_experience, skill:skills(id, name, icon, category, sort_order)')

  if (error) {
    throw error
  }

  return data ?? []
}
