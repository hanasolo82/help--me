import L from 'leaflet'

export function toFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// buildUserIcon: returns a Leaflet divIcon. Accepts classNames object to keep CSS modules local.
export function buildUserIcon({ avatarUrl, initial, classNames = {} }) {
  const imageClass = classNames.image || 'userMarkerImage'
  const fallbackClass = classNames.fallback || 'userMarker'

  if (avatarUrl) {
    return L.divIcon({
      className: imageClass,
      html: `<img src="${avatarUrl}" alt="" />`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    })
  }

  return L.divIcon({
    className: fallbackClass,
    html: `<span>${initial || 'Tu'}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}
