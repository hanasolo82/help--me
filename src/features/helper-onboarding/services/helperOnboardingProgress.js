const HELPER_ONBOARDING_PROGRESS_KEY = 'helpme-helper-onboarding-progress-v1'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function getHelperOnboardingStorageKey(userId) {
  return `${HELPER_ONBOARDING_PROGRESS_KEY}:${userId || 'anonymous'}`
}

export function readHelperOnboardingProgress(userId) {
  if (!canUseStorage()) {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getHelperOnboardingStorageKey(userId))
    const parsed = raw ? JSON.parse(raw) : null

    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeHelperOnboardingProgress(userId, progress) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(getHelperOnboardingStorageKey(userId), JSON.stringify(progress))
}

export function clearHelperOnboardingProgress(userId) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(getHelperOnboardingStorageKey(userId))
}

export function clearAllHelperOnboardingProgress() {
  if (!canUseStorage()) {
    return
  }

  const prefix = `${HELPER_ONBOARDING_PROGRESS_KEY}:`
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(prefix)) {
      window.localStorage.removeItem(key)
    }
  }
}
