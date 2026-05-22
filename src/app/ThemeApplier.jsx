import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'

const LIGHT_THEME = {
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

const DARK_THEME = {
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

const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password', '/reset-password', '/legal/terms', '/legal/privacy', '/legal/cookies'])

export default function ThemeApplier() {
  const { profile } = useAuth()
  const location = useLocation()
  const theme = profile?.theme === 'dark' ? 'dark' : 'light'
  const shouldApplyPrivateTheme = !PUBLIC_PATHS.has(location.pathname)
  const appliedTheme = shouldApplyPrivateTheme && profile ? theme : 'light'

  useEffect(() => {
    const root = document.documentElement
    const tokens = appliedTheme === 'dark' ? DARK_THEME : LIGHT_THEME

    root.setAttribute('data-theme', appliedTheme)

    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    root.style.colorScheme = appliedTheme
  }, [appliedTheme])

  return null
}
