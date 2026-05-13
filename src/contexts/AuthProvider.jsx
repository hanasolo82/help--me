import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContextBase'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { getCurrentSession, onAuthStateChange } from '../services/authService'
import { getProfileByUserId } from '../services/profilesService'

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

    async function bootstrapAuth() {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      const initialSession = await getCurrentSession()

      if (!isMounted) return

      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      await loadProfile(initialSession?.user ?? null)

      if (isMounted) setLoading(false)
    }

    bootstrapAuth()

    const subscription = onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      await loadProfile(nextSession?.user ?? null)
      setLoading(false)
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
