import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from './AuthContextBase'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import { getCurrentUser, onAuthStateChange } from '../services/authService'
import { getProfileByUserId } from '../services/profilesService'
import { clearClientSessionState } from '../services/sessionCleanup'

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
  const activeProfileRequestRef = useRef(0)
  const activeUserIdRef = useRef(null)

  const clearProfileState = useCallback(() => {
    activeProfileRequestRef.current += 1
    setProfile(null)
    setProfileLoading(false)
  }, [])

  const loadProfile = useCallback(async (nextUser) => {
    const requestedUserId = nextUser?.id ?? null
    const requestId = activeProfileRequestRef.current + 1
    activeProfileRequestRef.current = requestId

    if (!requestedUserId) {
      clearProfileState()
      return null
    }

    setProfile((current) => (current?.id === requestedUserId ? current : null))
    setProfileLoading(true)

    try {
      const nextProfile = await getProfileByUserId(requestedUserId)
      if (activeProfileRequestRef.current !== requestId || activeUserIdRef.current !== requestedUserId) {
        return null
      }

      setProfile(nextProfile)
      return nextProfile
    } catch {
      if (activeProfileRequestRef.current === requestId) {
        setProfile(null)
      }
      return null
    } finally {
      if (activeProfileRequestRef.current === requestId) {
        setProfileLoading(false)
      }
    }
  }, [clearProfileState])

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
        activeUserIdRef.current = validatedUser.id
        setSession(sessionResult.data.session)
        setUser(validatedUser)
        await loadProfile(validatedUser)
      } else {
        activeUserIdRef.current = null
        setSession(null)
        setUser(null)
        clearProfileState()
        clearClientSessionState()
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

      const nextUser = nextSession?.user ?? null
      const nextUserId = nextUser?.id ?? null
      const previousUserId = activeUserIdRef.current
      const changedUser = Boolean(previousUserId && nextUserId && previousUserId !== nextUserId)
      const endedSession = event === 'SIGNED_OUT' || (!nextUserId && Boolean(previousUserId))

      if (changedUser || endedSession) {
        clearProfileState()
        clearClientSessionState()
      }

      activeUserIdRef.current = nextUserId
      setSession(nextSession)
      setUser(nextUser)

      if (PROFILE_RELEVANT_EVENTS.has(event)) {
        await loadProfile(nextUser)
      }

      if (isMounted) setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [clearProfileState, loadProfile])

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
