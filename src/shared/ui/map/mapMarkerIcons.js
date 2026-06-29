import L from 'leaflet'
import { getAvatarInitial } from '../../../utils/avatar'
import { createActivityMarkerSvg } from '../../../features/tasks/categories/taskCategories'
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
  const activityGlyph = createActivityMarkerSvg(task?.category, { className: styles.taskPinGlyphSvg })
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
