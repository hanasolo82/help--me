export function getAvatarInitial(name, fallback = 'U') {
  const value = String(name ?? '').trim()

  if (!value) {
    return fallback
  }

  return value.charAt(0).toUpperCase()
}
