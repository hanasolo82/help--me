export const THEME_STORAGE_KEY = 'helpme-theme-preference'
export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'

const THEME_ALIAS_TOKENS = {
  '--color-bg': 'var(--hm-color-bg)',
  '--color-surface': 'var(--hm-color-surface)',
  '--color-surface-strong': 'var(--hm-color-surface-strong)',
  '--color-text': 'var(--hm-color-text)',
  '--color-text-muted': 'var(--hm-color-muted)',
  '--color-primary': 'var(--hm-color-primary)',
  '--color-primary-hover': 'var(--hm-color-primary-hover)',
  '--color-secondary': 'var(--hm-color-secondary)',
  '--color-accent': 'var(--hm-color-accent)',
  '--color-border': 'var(--hm-color-border)',
  '--color-border-subtle': 'var(--hm-color-border-subtle)',
  '--color-highlight': 'var(--hm-color-highlight)',
  '--color-shadow': 'var(--hm-color-shadow)',
  '--color-success': 'var(--hm-color-success-text)',
  '--color-success-bg': 'var(--hm-color-success-bg)',
  '--color-success-text': 'var(--hm-color-success-text)',
  '--color-warning': 'var(--hm-color-warning-text)',
  '--color-warning-bg': 'var(--hm-color-warning-bg)',
  '--color-warning-text': 'var(--hm-color-warning-text)',
  '--color-danger': 'var(--hm-color-danger)',
  '--app-background': 'var(--hm-app-background)',
  '--app-border': 'var(--hm-app-border)',
  '--bg': 'var(--hm-color-bg)',
  '--surface': 'var(--hm-color-surface)',
  '--surface-strong': 'var(--hm-color-surface-strong)',
  '--text': 'var(--hm-color-text)',
  '--text-muted': 'var(--hm-color-muted)',
  '--accent': 'var(--hm-color-accent)',
  '--primary': 'var(--hm-color-primary)',
  '--secondary': 'var(--hm-color-secondary)',
  '--highlight': 'var(--hm-color-highlight)',
  '--border': 'var(--hm-color-border)',
  '--shadow': 'var(--hm-color-shadow)',
  '--nav-bg': 'var(--hm-nav-bg)',
  '--nav-link': 'var(--hm-nav-link)',
  '--nav-border': 'var(--hm-nav-border)',
  '--nav-shadow': 'var(--hm-nav-shadow)',
  '--nav-active-bg': 'var(--hm-nav-active-bg)',
  '--nav-active-text': 'var(--hm-nav-active-text)',
  '--task-card-bg': 'var(--hm-task-card-bg)',
  '--task-card-text': 'var(--hm-task-card-text)',
  '--task-card-border': 'var(--hm-task-card-border)',
  '--task-card-shadow': 'var(--hm-task-card-shadow)',
  '--task-card-accent': 'var(--hm-task-card-accent)',
  '--task-card-highlight': 'var(--hm-task-card-highlight)',
}

const LIGHT_THEME_BASE = {
  '--hm-color-bg': '#f8f6f1',
  '--hm-color-text': '#1c1916',
  '--hm-color-surface': '#ffffff',
  '--hm-color-surface-strong': '#ffffff',
  '--hm-color-primary': '#1f6b48',
  '--hm-color-secondary': '#f0ebe0',
  '--hm-color-muted': '#6e6860',
  '--hm-color-accent': '#d9623b',
  '--hm-color-danger': '#c0392b',
  '--hm-color-border-subtle': '#eae6dd',
  '--hm-color-border': 'rgba(28, 25, 22, 0.14)',
  '--hm-color-highlight': 'rgba(31, 107, 72, 0.1)',
  '--hm-color-shadow': 'rgba(28, 25, 22, 0.12)',
  '--hm-color-success-bg': '#d1fae5',
  '--hm-color-success-text': '#065f46',
  '--hm-color-warning-bg': '#fef3c7',
  '--hm-color-warning-text': '#92400e',
  '--hm-color-primary-hover': '#2d7a55',
  '--hm-app-background': 'linear-gradient(180deg, #f8f6f1 0%, #fbfaf7 48%, #f8f6f1 100%)',
  '--hm-app-border': 'rgba(28, 25, 22, 0.12)',
  '--hm-nav-bg': 'rgba(248, 246, 241, 0.88)',
  '--hm-nav-link': '#1c1916',
  '--hm-nav-border': 'rgba(28, 25, 22, 0.12)',
  '--hm-nav-shadow': 'rgba(28, 25, 22, 0.08)',
  '--hm-nav-active-bg': '#1f6b48',
  '--hm-nav-active-text': '#ffffff',
  '--hm-task-card-bg': '#ffffff',
  '--hm-task-card-text': '#1c1916',
  '--hm-task-card-border': 'rgba(28, 25, 22, 0.12)',
  '--hm-task-card-shadow': 'rgba(28, 25, 22, 0.08)',
  '--hm-task-card-accent': '#1f6b48',
  '--hm-task-card-highlight': 'rgba(31, 107, 72, 0.1)',
}

const DARK_THEME_BASE = {
  '--hm-color-bg': '#11140f',
  '--hm-color-text': '#f8f6f1',
  '--hm-color-surface': 'rgba(22, 24, 20, 0.84)',
  '--hm-color-surface-strong': 'rgba(24, 26, 21, 0.94)',
  '--hm-color-primary': '#69c38f',
  '--hm-color-secondary': '#2b2f24',
  '--hm-color-muted': '#b8b2a7',
  '--hm-color-accent': '#e07b57',
  '--hm-color-danger': '#ef6d5b',
  '--hm-color-border-subtle': 'rgba(248, 246, 241, 0.12)',
  '--hm-color-border': 'rgba(248, 246, 241, 0.14)',
  '--hm-color-highlight': 'rgba(105, 195, 143, 0.14)',
  '--hm-color-shadow': 'rgba(0, 0, 0, 0.24)',
  '--hm-color-success-bg': 'rgba(34, 197, 94, 0.18)',
  '--hm-color-success-text': '#86efac',
  '--hm-color-warning-bg': 'rgba(245, 158, 11, 0.18)',
  '--hm-color-warning-text': '#fbbf24',
  '--hm-color-primary-hover': '#7bd69d',
  '--hm-app-background': 'linear-gradient(180deg, #11140f 0%, #171b15 48%, #11140f 100%)',
  '--hm-app-border': 'rgba(248, 246, 241, 0.12)',
  '--hm-nav-bg': 'rgba(17, 20, 15, 0.86)',
  '--hm-nav-link': '#f8f6f1',
  '--hm-nav-border': 'rgba(248, 246, 241, 0.12)',
  '--hm-nav-shadow': 'rgba(0, 0, 0, 0.28)',
  '--hm-nav-active-bg': '#69c38f',
  '--hm-nav-active-text': '#11140f',
  '--hm-task-card-bg': 'rgba(22, 24, 20, 0.84)',
  '--hm-task-card-text': '#f8f6f1',
  '--hm-task-card-border': 'rgba(248, 246, 241, 0.12)',
  '--hm-task-card-shadow': 'rgba(0, 0, 0, 0.24)',
  '--hm-task-card-accent': '#69c38f',
  '--hm-task-card-highlight': 'rgba(105, 195, 143, 0.14)',
}

function buildThemeTokens(baseTokens) {
  return {
    ...baseTokens,
    ...THEME_ALIAS_TOKENS,
  }
}

export const LIGHT_THEME = buildThemeTokens(LIGHT_THEME_BASE)
export const DARK_THEME = buildThemeTokens(DARK_THEME_BASE)

export function getStoredThemePreference() {
  if (typeof window === 'undefined') return null

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return value === THEME_DARK || value === THEME_LIGHT ? value : null
  } catch {
    return null
  }
}

export function setStoredThemePreference(theme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage errors in restricted browsers.
  }
}

export function resolveThemePreference({ isPrivateRoute = false, profileTheme = null } = {}) {
  const storedPreference = getStoredThemePreference()

  if (storedPreference) {
    return storedPreference
  }

  if (isPrivateRoute && profileTheme === THEME_DARK) {
    return THEME_DARK
  }

  return THEME_LIGHT
}

export function applyThemeToDocument(theme) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  const tokens = theme === THEME_DARK ? DARK_THEME : LIGHT_THEME

  root.setAttribute('data-theme', theme)

  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })

  root.style.colorScheme = theme
}
