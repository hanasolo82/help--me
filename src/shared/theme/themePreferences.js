export const THEME_STORAGE_KEY = 'helpme-theme-preference'
export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'

export const LIGHT_THEME = {
  '--color-bg': '#f7fbff',
  '--color-surface': 'rgba(255, 255, 255, 0.72)',
  '--color-surface-strong': 'rgba(255, 255, 255, 0.88)',
  '--color-text': '#0f172a',
  '--color-text-muted': '#3e4a60',
  '--color-primary': '#178cff',
  '--color-primary-hover': '#1a6fe8',
  '--color-secondary': '#2b8dd1',
  '--color-accent': '#0ca3d3',
  '--color-border': 'rgba(255, 255, 255, 0.18)',
  '--color-success': '#16a34a',
  '--color-warning': '#f59e0b',
  '--color-danger': '#dc2626',
  '--app-background': 'linear-gradient(180deg, #f8fbff 0%, #eef6ff 48%, #f9fbff 100%)',
  '--radius-pill': '999rem',
  '--shadow-xs': '0 1px 2px rgba(15, 23, 42, 0.03)',
  '--shadow-sm': '0 2px 12px rgba(15, 23, 42, 0.04)',
  '--shadow-md': '0 10px 30px rgba(15, 23, 42, 0.06)',
  '--shadow-lg': '0 24px 60px rgba(15, 23, 42, 0.1)',
  '--shadow-xl': '0 30px 72px rgba(15, 23, 42, 0.16), 0 12px 28px rgba(15, 23, 42, 0.08)',
  '--shadow-focus': '0 0 0 4px rgba(37, 99, 235, 0.12)',
  '--shadow-primary': '0 14px 30px rgba(37, 99, 235, 0.22)',
  '--motion-fast': '140ms',
  '--motion-normal': '180ms',
  '--motion-slow': '240ms',
  '--ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--ease-spring-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--bg': '#f7fbff',
  '--surface': 'rgba(255, 255, 255, 0.72)',
  '--surface-strong': 'rgba(255, 255, 255, 0.88)',
  '--text': '#0f172a',
  '--text-muted': '#3e4a60',
  '--accent': '#0ca3d3',
  '--primary': '#178cff',
  '--secondary': '#2b8dd1',
  '--highlight': 'rgba(41, 171, 255, 0.1)',
  '--border': 'rgba(255, 255, 255, 0.18)',
  '--shadow': 'rgba(15, 23, 42, 0.12)',
  '--nav-bg': 'rgba(255, 255, 255, 0.76)',
  '--nav-link': '#0f172a',
  '--nav-border': 'rgba(255, 255, 255, 0.18)',
  '--nav-shadow': 'rgba(15, 23, 42, 0.08)',
  '--nav-active-bg': '#178cff',
  '--nav-active-text': '#ffffff',
  '--task-card-bg': 'rgba(255, 255, 255, 0.72)',
  '--task-card-text': '#0f172a',
  '--task-card-border': 'rgba(255, 255, 255, 0.2)',
  '--task-card-shadow': 'rgba(15, 23, 42, 0.08)',
  '--task-card-accent': '#178cff',
  '--task-card-highlight': 'rgba(41, 171, 255, 0.12)',
}

export const DARK_THEME = {
  '--color-bg': '#0b1220',
  '--color-surface': 'rgba(15, 23, 42, 0.72)',
  '--color-surface-strong': 'rgba(15, 23, 42, 0.88)',
  '--color-text': '#f8fbff',
  '--color-text-muted': '#b8c7db',
  '--color-primary': '#53c8ff',
  '--color-primary-hover': '#41d4ff',
  '--color-secondary': '#6cc6ff',
  '--color-accent': '#41d4ff',
  '--color-border': 'rgba(255, 255, 255, 0.14)',
  '--color-success': '#22c55e',
  '--color-warning': '#f59e0b',
  '--color-danger': '#ef4444',
  '--app-background': 'linear-gradient(180deg, #0b1220 0%, #0f172a 48%, #111c31 100%)',
  '--radius-pill': '999rem',
  '--shadow-xs': '0 1px 2px rgba(0, 0, 0, 0.16)',
  '--shadow-sm': '0 2px 12px rgba(0, 0, 0, 0.24)',
  '--shadow-md': '0 10px 30px rgba(0, 0, 0, 0.28)',
  '--shadow-lg': '0 24px 60px rgba(0, 0, 0, 0.34)',
  '--shadow-xl': '0 30px 72px rgba(0, 0, 0, 0.38), 0 12px 28px rgba(0, 0, 0, 0.22)',
  '--shadow-focus': '0 0 0 4px rgba(65, 212, 255, 0.14)',
  '--shadow-primary': '0 14px 30px rgba(65, 212, 255, 0.2)',
  '--motion-fast': '140ms',
  '--motion-normal': '180ms',
  '--motion-slow': '240ms',
  '--ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--ease-spring-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--bg': '#0b1220',
  '--surface': 'rgba(15, 23, 42, 0.72)',
  '--surface-strong': 'rgba(15, 23, 42, 0.88)',
  '--text': '#f8fbff',
  '--text-muted': '#b8c7db',
  '--accent': '#41d4ff',
  '--primary': '#53c8ff',
  '--secondary': '#6cc6ff',
  '--highlight': 'rgba(65, 212, 255, 0.12)',
  '--border': 'rgba(255, 255, 255, 0.14)',
  '--shadow': 'rgba(0, 0, 0, 0.24)',
  '--nav-bg': 'rgba(14, 19, 37, 0.76)',
  '--nav-link': '#f8fbff',
  '--nav-border': 'rgba(255, 255, 255, 0.14)',
  '--nav-shadow': 'rgba(0, 0, 0, 0.24)',
  '--nav-active-bg': '#53c8ff',
  '--nav-active-text': '#0f172a',
  '--task-card-bg': 'rgba(15, 23, 42, 0.72)',
  '--task-card-text': '#f8fbff',
  '--task-card-border': 'rgba(255, 255, 255, 0.14)',
  '--task-card-shadow': 'rgba(0, 0, 0, 0.24)',
  '--task-card-accent': '#41d4ff',
  '--task-card-highlight': 'rgba(65, 212, 255, 0.14)',
}

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
