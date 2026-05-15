import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContextBase'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, onAuthStateChange } from '../services/authService'
import { getProfileByUserId } from '../services/profilesService'

// Eventos donde tiene sentido recargar el profile. TOKEN_REFRESHED ocurre cada hora
// y no cambia datos del usuario, por lo que se ignora para evitar fetches inutiles.
const PROFILE_RELEVANT_EVENTS = new Set([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'SIGNED_OUT',
  'USER_UPDATED',
  'PASSWORD_RECOVERY',
])

// Estado global de auth: sesion Supabase + user + profile de dominio.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (nextUser) => {
    if (!nextUser) {
      setProfile(null)
      return null
    }

    setProfileLoading(true)

    try {
      const nextProfile = await getProfileByUserId(nextUser.id)
      setProfile(nextProfile)
      return nextProfile
    } catch {
      setProfile(null)
      return null
    } finally {
      setProfileLoading(false)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    return loadProfile(user)
  }, [loadProfile, user])

  useEffect(() => {
    let isMounted = true
    let didBootstrap = false

    async function bootstrapAuth() {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      // getUser() valida el JWT contra el servidor; getSession() solo lee localStorage.
      // Si el token es invalido getUser devuelve null y descartamos la session local.
      const [validatedUser, sessionResult] = await Promise.all([
        getCurrentUser(),
        supabase.auth.getSession(),
      ])

      if (!isMounted) return

      if (validatedUser) {
        setSession(sessionResult.data.session)
        setUser(validatedUser)
        await loadProfile(validatedUser)
      } else {
        setSession(null)
        setUser(null)
        setProfile(null)
      }

      if (isMounted) {
        didBootstrap = true
        setLoading(false)
      }
    }

    bootstrapAuth()

    const subscription = onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return

      // Antes del bootstrap inicial, ignoramos eventos para no pisar el estado validado.
      // INITIAL_SESSION llegara y reconciliara cuando bootstrap haya terminado.
      if (!didBootstrap && event !== 'INITIAL_SESSION') return

      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (PROFILE_RELEVANT_EVENTS.has(event)) {
        await loadProfile(nextSession?.user ?? null)
      }

      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(() => ({
    isConfigured: isSupabaseConfigured,
    session,
    user,
    profile,
    loading,
    profileLoading,
    refreshProfile,
  }), [session, user, profile, loading, profileLoading, refreshProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
