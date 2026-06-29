export const TASK_ACTIVITY_KEYS = Object.freeze([
  'cleaning',
  'moving',
  'errands',
  'repairs',
  'classes',
  'care',
  'pets',
  'tech',
  'other',
])

export const TASK_ACTIVITY_VISUALS = Object.freeze({
  cleaning: {
    key: 'cleaning',
    label: 'Limpieza',
    background: '#e7f7ef',
    foreground: '#1f6b48',
    accent: '#f1b45c',
  },
  moving: {
    key: 'moving',
    label: 'Mudanza / transportar',
    background: '#eef1ff',
    foreground: '#3f4d9a',
    accent: '#d9623b',
  },
  errands: {
    key: 'errands',
    label: 'Recados / compras',
    background: '#fff4df',
    foreground: '#7a4a12',
    accent: '#2f7d62',
  },
  repairs: {
    key: 'repairs',
    label: 'Reparaciones',
    background: '#f3eefc',
    foreground: '#5c3f8f',
    accent: '#d9623b',
  },
  classes: {
    key: 'classes',
    label: 'Clases / apoyo',
    background: '#eaf4ff',
    foreground: '#235f8f',
    accent: '#f1b45c',
  },
  care: {
    key: 'care',
    label: 'Cuidado / acompañamiento',
    background: '#ffeef3',
    foreground: '#8a3150',
    accent: '#2f7d62',
  },
  pets: {
    key: 'pets',
    label: 'Mascotas',
    background: '#edf8e8',
    foreground: '#2f6a28',
    accent: '#d9623b',
  },
  tech: {
    key: 'tech',
    label: 'Tecnología',
    background: '#e8f6f8',
    foreground: '#1f6873',
    accent: '#f1b45c',
  },
  other: {
    key: 'other',
    label: 'Otros',
    background: '#f2f0ea',
    foreground: '#5b5548',
    accent: '#2f7d62',
  },
})

// Mapa categoría (normalizada) → actividad/glifo. Incluye los valores históricos y las
// etiquetas de categoría actuales en español, para que cada una resuelva a su HelpMoji.
const CATEGORY_TO_ACTIVITY = Object.freeze({
  // valores históricos (tareas creadas antes de ampliar el catálogo)
  mascotas: 'pets',
  recados: 'errands',
  compras: 'errands',
  ayuda_tecnica: 'tech',
  // etiquetas del catálogo actual
  limpieza: 'cleaning',
  mudanza: 'moving',
  reparaciones: 'repairs',
  clases: 'classes',
  cuidado: 'care',
  tecnologia: 'tech',
  otros: 'other',
})

function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function getTaskActivityKey(category) {
  const normalized = normalizeCategory(category)

  return CATEGORY_TO_ACTIVITY[normalized] || TASK_ACTIVITY_VISUALS[normalized]?.key || 'other'
}

export function getTaskCategoryVisual(category) {
  const key = getTaskActivityKey(category)

  return TASK_ACTIVITY_VISUALS[key] || TASK_ACTIVITY_VISUALS.other
}

export function getTaskCategoryLabel(category) {
  return getTaskCategoryVisual(category).label
}

export function getTaskCategoryStyle(category) {
  const visual = getTaskCategoryVisual(category)

  return {
    '--activity-bg': visual.background,
    '--activity-fg': visual.foreground,
    '--activity-accent': visual.accent,
  }
}

function markerSvgBody(key, visual) {
  const fill = visual.background
  const stroke = visual.foreground
  const accent = visual.accent

  switch (key) {
    case 'cleaning':
      return `<rect x="6" y="10" width="12" height="7" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/><path d="M8 9l2-3 2 3M15 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="${accent}"/>`
    case 'moving':
      return `<path d="M6 8.5h10.5l2 3.2V18H6z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.5V6h5v2.5M9 13h6M14 11l2 2-2 2" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
    case 'errands':
      return `<path d="M7 9h10l-.8 9H7.8z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0M10 13.2l1.6 1.6 3.3-3.5" fill="none" stroke="${accent}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
    case 'repairs':
      return `<path d="M15.8 5.5a4 4 0 0 0 2.7 5l-7.7 7.7a2 2 0 0 1-2.8-2.8l7.8-7.8a4 4 0 0 0 0-2.1z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9.2" cy="16.8" r="1" fill="${accent}"/>`
    case 'classes':
      return `<path d="M6 7.5c2.2-.8 4.2-.6 6 .8 1.8-1.4 3.8-1.6 6-.8V18c-2.2-.8-4.2-.6-6 .8-1.8-1.4-3.8-1.6-6-.8z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8.3v10M15.2 11.5l2.5 2.5" stroke="${accent}" stroke-width="1.8" stroke-linecap="round"/>`
    case 'care':
      return `<circle cx="9" cy="9" r="2.4" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/><circle cx="15" cy="9" r="2.4" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/><path d="M6.5 18c.9-2.4 3.3-3.4 5.5-2.1 2.2-1.3 4.6-.3 5.5 2.1" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/><path d="M12 14.2l-1.6-1.5a1.5 1.5 0 0 1 2.1-2.1 1.5 1.5 0 0 1 2.1 2.1z" fill="${accent}"/>`
    case 'pets':
      return `<circle cx="8.2" cy="8.2" r="1.7" fill="${accent}"/><circle cx="12" cy="6.8" r="1.8" fill="${accent}"/><circle cx="15.8" cy="8.2" r="1.7" fill="${accent}"/><circle cx="9.4" cy="12" r="1.6" fill="${accent}"/><circle cx="14.6" cy="12" r="1.6" fill="${accent}"/><path d="M7.5 17.2c1.1-3.2 3-4.7 4.5-4.7s3.4 1.5 4.5 4.7c.4 1.2-.5 2.3-1.8 2l-1.1-.3a6 6 0 0 0-3.2 0l-1.1.3c-1.3.3-2.2-.8-1.8-2z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>`
    case 'tech':
      return `<rect x="8" y="4.8" width="8" height="14.4" rx="2.2" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/><path d="M11 16.5h2" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round"/><path d="M17 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" fill="${accent}"/>`
    default:
      return `<path d="M12 4.8l1.7 4 4.3.4-3.2 2.8 1 4.2-3.8-2.2-3.8 2.2 1-4.2L6 9.2l4.3-.4z" fill="${fill}" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.7" fill="${accent}"/>`
  }
}

export function createActivityMarkerSvg(category, { className = '' } = {}) {
  const visual = getTaskCategoryVisual(category)
  const body = markerSvgBody(visual.key, visual)
  const classAttr = className ? ` class="${className}"` : ''

  return `<svg${classAttr} viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`
}
