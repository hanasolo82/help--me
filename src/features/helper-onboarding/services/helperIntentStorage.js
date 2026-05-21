const HELPER_HOME_MODE_KEY = 'helpme-home-mode-intent-v1'

function canUseStorage() {
  return typeof window !== 'undefined'
}

export function setHelperHomeIntent(mode) {
  if (!canUseStorage()) return
  const nextMode = mode === 'need' ? 'need' : 'help'
  window.sessionStorage.setItem(HELPER_HOME_MODE_KEY, nextMode)
}

export function changeHelperHomeIntent(mode) {
  setHelperHomeIntent(mode)
}

export function readHelperHomeIntent() {
  if (!canUseStorage()) return ''
  return window.sessionStorage.getItem(HELPER_HOME_MODE_KEY) || ''
}

export function clearHelperHomeIntent() {
  if (!canUseStorage()) return
  window.sessionStorage.removeItem(HELPER_HOME_MODE_KEY)
}
