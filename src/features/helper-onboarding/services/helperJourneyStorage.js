const HELPER_JOURNEY_PROGRESS_KEY = 'helpme-helper-journey-progress-v1'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function readHelperJourneyProgress() {
  if (!canUseStorage()) return null

  try {
    const raw = window.localStorage.getItem(HELPER_JOURNEY_PROGRESS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeHelperJourneyProgress(progress) {
  if (!canUseStorage()) return
  window.localStorage.setItem(HELPER_JOURNEY_PROGRESS_KEY, JSON.stringify(progress))
}

export function clearHelperJourneyProgress() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(HELPER_JOURNEY_PROGRESS_KEY)
}
