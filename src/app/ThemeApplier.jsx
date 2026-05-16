import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import { DEFAULT_PALETTE } from '../lib/palettes'

const LIGHT_THEME = {
  '--cc-navy': '#10162f',
  '--cc-blue': '#1804c9',
  '--cc-yellow': '#ffd300',
  '--cc-cream': '#fff0e5',
  '--cc-white': '#ffffff',
  '--bg': '#fff0e5',
  '--surface': '#ffffff',
  '--text': '#10162f',
  '--accent': '#1804c9',
  '--highlight': '#ffd300',
  '--shadow': '#10162f',
  '--nav-bg': 'rgba(255, 255, 255, 0.98)',
  '--nav-link': '#10162f',
  '--nav-border': '#10162f',
  '--nav-shadow': '#10162f',
  '--nav-active-bg': '#1804c9',
  '--nav-active-text': '#ffffff',
  '--task-card-bg': '#ffffff',
  '--task-card-text': '#10162f',
  '--task-card-border': '#10162f',
  '--task-card-shadow': '#10162f',
  '--task-card-accent': '#1804c9',
  '--task-card-highlight': '#ffd300',
}

const DARK_THEME = {
  '--cc-navy': '#fff0e5',
  '--cc-blue': '#ffd300',
  '--cc-yellow': '#3a10e5',
  '--cc-cream': '#10162f',
  '--cc-white': '#000000',
  '--bg': '#10162f',
  '--surface': '#000000',
  '--text': '#fff0e5',
  '--accent': '#ffd300',
  '--highlight': '#3a10e5',
  '--shadow': '#fff0e5',
  '--nav-bg': 'rgba(14, 19, 37, 0.96)',
  '--nav-link': '#fff0e5',
  '--nav-border': '#fff0e5',
  '--nav-shadow': '#fff0e5',
  '--nav-active-bg': '#ffd300',
  '--nav-active-text': '#10162f',
  '--task-card-bg': '#000000',
  '--task-card-text': '#fff0e5',
  '--task-card-border': '#fff0e5',
  '--task-card-shadow': '#fff0e5',
  '--task-card-accent': '#ffd300',
  '--task-card-highlight': '#3a10e5',
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
    root.setAttribute('data-palette', DEFAULT_PALETTE.key)

    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    root.style.colorScheme = appliedTheme
  }, [appliedTheme])

  return null
}
