export const MAX_PROFILE_SKILLS = 6
export const MAX_CUSTOM_SKILLS = 3
export const MAX_SKILL_NAME_LENGTH = 50

export const HELPER_SKILL_CATEGORIES = Object.freeze([
  'Hogar',
  'Mascotas',
  'Tecnología',
  'Recados',
  'Personas',
])

export function normalizeSkillName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

export function normalizeSkillNameForComparison(value) {
  return normalizeSkillName(value)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
