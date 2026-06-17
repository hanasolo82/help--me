import { createUserMarkerIcon } from '../ui/map/mapMarkerIcons'

export function toFiniteNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Wrapper legacy: keeps old callers on the centralized marker theme.
export function buildUserIcon({ avatarUrl, initial }) {
  return createUserMarkerIcon({ avatarUrl, initial })
}
