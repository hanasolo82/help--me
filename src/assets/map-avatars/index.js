// Catalogo de avatares predefinidos para el marcador del mapa.
// Drop de las 10 imagenes (png, webp o svg) en esta carpeta. Convencion sugerida:
// 01.webp, 02.webp, ..., 10.webp -> el id usado en DB sera "01", "02", ..., "10".
// La lista se ordena alfabeticamente por nombre de fichero.

const modules = import.meta.glob('./*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
})

export const MAP_AVATAR_OPTIONS = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url]) => {
    const filename = path.replace(/^\.\//, '')
    const id = filename.replace(/\.[^.]+$/, '')
    return { id, url, label: id }
  })

export const MAP_AVATAR_SLOTS = 10

// Acepta:
// - id corto del catalogo ("01", "02"...): devuelve la URL del asset bundled.
// - URL absoluta o relativa heredada de la version anterior (Supabase Storage): se devuelve tal cual.
// - null/undefined/desconocido: null.
export function resolveMapAvatarUrl(value) {
  if (!value) return null
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value
  return MAP_AVATAR_OPTIONS.find((option) => option.id === value)?.url || null
}
