import L from 'leaflet'
import { getAvatarInitial } from '../../../utils/avatar'
import { categoryIconSvg } from '../../../design/categoryIconSvg'
import { getTaskStatusLabel as getTaskStatusLabelValue } from '../../../features/tasks/utils/taskStatusLabels'
import styles from './MapMarkerSystem.module.css'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatPrice(value) {
  const price = Number(value ?? 0)
  if (!Number.isFinite(price)) return '0 €'
  return `${Math.round(price)} €`
}

// Ancho aproximado del pin a partir del texto, para que la pastilla se ajuste al contenido
// (precio centrado) y la punta quede anclada con precisión sobre el punto del mapa.
function estimatePinWidth(text, { glyph = true } = {}) {
  const base = glyph ? 34 : 18
  return Math.max(40, Math.round(base + String(text).length * 7.2))
}

export function getTaskStatusLabel(task) {
  return getTaskStatusLabelValue(task?.status || 'open')
}

export function createTaskMarkerIcon({ task, selected = false, requester = false } = {}) {
  const className = [
    styles.taskPin,
    requester ? styles.taskPinOwn : '',
    selected ? styles.taskPinSelected : '',
  ].filter(Boolean).join(' ')
  // Glifo de la biblioteca de diseño (src/design), como el pin del requester:
  // icono Lucide plano en currentColor, que hereda el color de texto de la
  // pastilla (--hm-map-marker-fg) y se adapta a tema claro/oscuro. La variante
  // requester (chip blanco fijo) fuerza negro fijo vía CSS. Sustituye al
  // HelpMoji a color; la pastilla (precio, punta, selección) no cambia.
  const activityGlyph = categoryIconSvg(task?.category, {
    className: styles.taskPinGlyphSvg,
    size: 16,
    strokeWidth: 2.25,
    color: 'currentColor',
  })
  const price = escapeHtml(formatPrice(task?.price))
  const html = `
    <span class="${styles.taskPinGlyph}">${activityGlyph}</span>
    <span class="${styles.taskPinPrice}">${price}</span>
  `
  const height = selected ? 32 : 28
  const width = estimatePinWidth(price)
  // La punta (::after) cuelga ~6px por debajo de la pastilla; el ancla apunta a su vértice.
  return L.divIcon({
    className,
    html,
    iconSize: [width, height],
    iconAnchor: [width / 2, height + 6],
  })
}

/**
 * Pin de solicitud propia: gota con punta hacia la coordenada exacta, glifo de
 * categoría grande y legible, y badge de respuestas solo cuando hay alguna
 * (nunca "0"). Estados: propio (acento de marca), seleccionado y hover con
 * elevación sutil; aparece con una animación de drop suave.
 */
export function createOwnTaskPinIcon({ task, selected = false, responses = 0 } = {}) {
  // Glifo de la biblioteca de diseño (src/design): icono Lucide plano por
  // categoría, negro fijo sobre el círculo blanco fijo del pin (regla del
  // design system: los iconos pequeños nunca llevan color de marca; legible en
  // tema claro y oscuro). Sustituye al HelpMoji a color anterior. La carcasa
  // (gota, badge de respuestas, selección, anclas) no cambia.
  const activityGlyph = categoryIconSvg(task?.category, {
    className: styles.ownPinGlyphSvg,
    size: 24,
    strokeWidth: 2,
  })
  const count = Number(responses)
  const badge = Number.isFinite(count) && count > 0
    ? `<span class="${styles.ownPinBadge}">${escapeHtml(count > 99 ? '99+' : String(count))}</span>`
    : ''
  const html = `
    <span class="${styles.ownPinBody}">
      <span class="${styles.ownPinGlyph}">${activityGlyph}</span>
      ${badge}
    </span>
  `
  // Cuerpo 44px + punta 10px: el ancla cae en el vértice de la punta, sobre la coordenada.
  return L.divIcon({
    className: [styles.ownPin, selected ? styles.ownPinSelected : ''].filter(Boolean).join(' '),
    html,
    iconSize: [44, 54],
    iconAnchor: [22, 54],
    popupAnchor: [0, -50],
    tooltipAnchor: [0, -50],
  })
}

export function createHelperMarkerIcon({ helper, selected = false, compact = false } = {}) {
  const avatarUrl = helper?.map_avatar_url || helper?.avatar_url
  const name = helper?.display_name || helper?.full_name || helper?.username || 'Vecino'
  const initial = escapeHtml(getAvatarInitial(name, 'V'))
  const className = [
    styles.helperMarker,
    compact ? styles.helperMarkerCompact : '',
    selected ? styles.helperMarkerSelected : '',
  ].filter(Boolean).join(' ')
  const html = avatarUrl
    ? `<img class="${styles.markerAvatar}" src="${escapeHtml(avatarUrl)}" alt="" />`
    : `<span class="${styles.markerFallback}">${initial}</span>`
  const size = selected ? [54, 54] : compact ? [38, 38] : [46, 46]
  const anchor = [size[0] / 2, size[1] / 2]

  return L.divIcon({
    className,
    html,
    iconSize: size,
    iconAnchor: anchor,
  })
}

export function createUserMarkerIcon({ avatarUrl, initial } = {}) {
  const html = avatarUrl
    ? `<img class="${styles.markerAvatar}" src="${escapeHtml(avatarUrl)}" alt="" />`
    : `<span class="${styles.markerFallback}">${escapeHtml(initial || 'Tu')}</span>`

  return L.divIcon({
    className: styles.userMarker,
    html,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

export function createClusterMarkerIcon({ count } = {}) {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0
  const text = escapeHtml(`${safeCount}`)
  const height = 28
  const width = estimatePinWidth(text, { glyph: false })

  return L.divIcon({
    className: [styles.taskPin, styles.taskPinCluster].filter(Boolean).join(' '),
    html: `<span class="${styles.taskPinPrice}">${text}</span>`,
    iconSize: [width, height],
    iconAnchor: [width / 2, height + 6],
  })
}
