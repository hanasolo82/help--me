import L from 'leaflet'
import { getAvatarInitial } from '../../../utils/avatar'
import { createActivityMarkerSvg } from '../../../features/tasks/categories/taskCategories'
import styles from './MapMarkerSystem.module.css'

const TASK_STATUS_LABELS = {
  draft: 'Borrador',
  open: 'Publicada',
  assigned: 'Oferta',
  in_progress: 'En curso',
  completed: 'Hecha',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
}

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
  if (!Number.isFinite(price)) return '0 EUR'
  return `${Math.round(price)} EUR`
}

export function getTaskStatusLabel(task) {
  return TASK_STATUS_LABELS[task?.status] || task?.status || 'Publicada'
}

export function createTaskMarkerIcon({ task, selected = false, requester = false } = {}) {
  const className = [
    requester ? styles.requesterTaskMarker : styles.taskMarker,
    selected ? (requester ? styles.requesterTaskMarkerSelected : styles.taskMarkerSelected) : '',
  ].filter(Boolean).join(' ')
  const activityGlyph = createActivityMarkerSvg(task?.category, { className: styles.taskMarkerGlyphSvg })
  const price = escapeHtml(formatPrice(task?.price))
  const status = escapeHtml(getTaskStatusLabel(task))
  const html = requester
    ? `
      <span class="${styles.requesterTaskMarkerInner}">
        <span class="${styles.requesterTaskMarkerDot}">${activityGlyph}</span>
        <span class="${styles.requesterTaskMarkerText}">
          <span class="${styles.requesterTaskMarkerLabel}">Tu tarea</span>
          <span class="${styles.requesterTaskMarkerStatus}">${status}</span>
        </span>
      </span>
    `
    : `
      <span class="${styles.taskMarkerBody}">
        <span class="${styles.taskMarkerGlyph}">${activityGlyph}</span>
        <span class="${styles.taskMarkerPrice}">${price}</span>
      </span>
    `
  const size = requester ? (selected ? [92, 52] : [84, 46]) : (selected ? [62, 52] : [56, 46])
  const anchor = requester ? [size[0] / 2, size[1] - 4] : [size[0] / 2, size[1] / 2]

  return L.divIcon({
    className,
    html,
    iconSize: size,
    iconAnchor: anchor,
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

  return L.divIcon({
    className: styles.requesterTaskMarker,
    html: `
      <span class="${styles.requesterTaskMarkerInner}">
        <span class="${styles.requesterTaskMarkerDot}">${safeCount}</span>
        <span class="${styles.requesterTaskMarkerText}">
          <span class="${styles.requesterTaskMarkerLabel}">Puntos</span>
          <span class="${styles.requesterTaskMarkerStatus}">agrupados</span>
        </span>
      </span>
    `,
    iconSize: [86, 46],
    iconAnchor: [43, 42],
  })
}
