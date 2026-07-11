const TASK_CATEGORIES_BY_SKILL_CATEGORY = Object.freeze({
  Hogar: ['Limpieza', 'Mudanza', 'Reparaciones'],
  Mascotas: ['Mascotas'],
  Tecnología: ['Ayuda tecnica', 'Tecnología'],
  Recados: ['Recados', 'Compras'],
  Personas: ['Cuidado'],
})

function getSkillCategory(skill) {
  return String(skill?.category || skill?.skill?.category || '').trim()
}

export function getDirectRequestCategories(helper) {
  const categories = []

  for (const skill of helper?.skills || []) {
    for (const taskCategory of TASK_CATEGORIES_BY_SKILL_CATEGORY[getSkillCategory(skill)] || []) {
      if (!categories.includes(taskCategory)) {
        categories.push(taskCategory)
      }
    }
  }

  return categories
}

export function canHelperReceiveDirectRequest(helper) {
  return helper?.accepts_direct_requests === true && helper?.availability_enabled !== false
}
