export const ALL_HELPER_CATEGORY_ID = 'all'

export const MAP_CATEGORY_FILTERS = [
  { id: ALL_HELPER_CATEGORY_ID, label: 'Todas', defaultVisible: true },
  { id: 'Recados', label: 'Recados', defaultVisible: true },
  { id: 'Mascotas', label: 'Mascotas', defaultVisible: true },
  { id: 'Compras', label: 'Compras' },
  { id: 'Ayuda tecnica', label: 'Ayuda técnica' },
]

const EMOJI_RANGES = [
  [0x1f300, 0x1faff],
  [0x2600, 0x27bf],
]

function isEmojiCodePoint(codePoint) {
  if (codePoint === 0xfe0f) return true

  return EMOJI_RANGES.some(([start, end]) => codePoint >= start && codePoint <= end)
}

export function cleanCategoryLabel(value) {
  const label = [...String(value || '')]
    .filter((character) => !isEmojiCodePoint(character.codePointAt(0)))
    .join('')
    .trim()

  return label || 'Categoría'
}

export function getDefaultVisibleMapCategoryIds() {
  return MAP_CATEGORY_FILTERS
    .filter((filter) => filter.defaultVisible)
    .map((filter) => filter.id)
}

export function buildMapCategoryFilters(dynamicFilters = []) {
  const byId = new Map()

  for (const filter of MAP_CATEGORY_FILTERS) {
    byId.set(filter.id, filter)
  }

  for (const filter of dynamicFilters) {
    const id = filter?.id || filter?.category || filter?.name
    if (!id || byId.has(id)) continue

    byId.set(id, {
      id,
      label: cleanCategoryLabel(filter?.name || id),
      defaultVisible: false,
    })
  }

  return [...byId.values()]
}
