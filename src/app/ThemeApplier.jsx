import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/useAuth'
import {
  applyThemeToDocument,
  resolveThemePreference,
  THEME_DARK,
} from '../shared/theme/themePreferences'

const PUBLIC_PATHS = new Set(['/', '/login', '/forgot-password', '/reset-password', '/legal/terms', '/legal/privacy', '/legal/cookies'])

export default function ThemeApplier() {
  const { profile } = useAuth()
  const location = useLocation()
  const shouldApplyPrivateTheme = !PUBLIC_PATHS.has(location.pathname)
  const appliedTheme = resolveThemePreference({
    isPrivateRoute: shouldApplyPrivateTheme,
    profileTheme: profile?.theme === THEME_DARK ? THEME_DARK : null,
  })

  useEffect(() => {
    applyThemeToDocument(appliedTheme)
  }, [appliedTheme])

  return null
}
