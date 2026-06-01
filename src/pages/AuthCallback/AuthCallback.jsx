import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { readHelperHomeIntent, clearHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { readHelperJourneyProgress } from '../../features/helper-onboarding/services/helperJourneyStorage'
import { readHelperOnboardingProgress } from '../../features/helper-onboarding/services/helperOnboardingProgress'
import { needsRequesterProfile } from '../../features/onboarding/utils/requesterPermissions'

function buildHomeState(intent) {
  return { mode: intent === 'help' ? 'help' : 'need' }
}

function buildOnboardingState(intent) {
  return {
    mode: intent === 'help' ? 'help' : 'need',
    returnTo: '/home',
    entry: intent === 'help' ? 'helper' : 'requester',
  }
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isConfigured, session, user, profile, loading, profileLoading } = useAuth()
  const resolvedRef = useRef(false)
  const intent = readHelperHomeIntent()
  const [authTimeoutElapsed, setAuthTimeoutElapsed] = useState(false)
  const helperOnboardingProgress = useMemo(
    () => readHelperOnboardingProgress(user?.id),
    [user?.id],
  )
  const helperJourneyProgress = useMemo(
    () => readHelperJourneyProgress(),
    [],
  )
  const helperResumeTarget = useMemo(() => {
    if (!profile || profile?.helper_status === 'active') {
      return null
    }

    const onboardingUpdatedAt = Number(new Date(helperOnboardingProgress?.updatedAt || 0))
    const journeyUpdatedAt = Number(new Date(helperJourneyProgress?.updatedAt || 0))

    if (!Number.isFinite(onboardingUpdatedAt) && !Number.isFinite(journeyUpdatedAt)) {
      return null
    }

    if (onboardingUpdatedAt >= journeyUpdatedAt && helperOnboardingProgress?.draft?.mode === 'help') {
      return 'onboarding'
    }

    if (Number.isFinite(journeyUpdatedAt)) {
      return 'journey'
    }

    return helperOnboardingProgress?.draft?.mode === 'help' ? 'onboarding' : null
  }, [helperJourneyProgress, helperOnboardingProgress, profile])

  const hasAuthCallbackPayload = useMemo(() => {
    const searchParams = new URLSearchParams(location.search)
    return (
      searchParams.has('code') ||
      searchParams.has('error') ||
      searchParams.has('token_hash') ||
      searchParams.has('type') ||
      location.hash.includes('access_token=') ||
      location.hash.includes('error=')
    )
  }, [location.hash, location.search])

  useDocumentMeta({
    title: 'Comprobando acceso',
    description: 'Estamos terminando de validar tu sesión.',
    path: '/auth/callback',
    noindex: true,
  })

  useEffect(() => {
    if (!hasAuthCallbackPayload) {
      let cancelled = false

      queueMicrotask(() => {
        if (cancelled) return
        setAuthTimeoutElapsed(true)
      })

      return () => {
        cancelled = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setAuthTimeoutElapsed(true)
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [hasAuthCallbackPayload])

  useEffect(() => {
    async function resolveRedirect() {
      if (!isConfigured || resolvedRef.current) {
        return
      }

      if (loading || profileLoading) {
        return
      }

      if (!session) {
        if (hasAuthCallbackPayload && !authTimeoutElapsed) {
          return
        }

        clearHelperHomeIntent()
        resolvedRef.current = true
        navigate('/login', {
          replace: true,
          state: { reason: 'session-missing' },
        })
        return
      }

      if (!user) {
        return
      }

      if (helperResumeTarget === 'onboarding') {
        clearHelperHomeIntent()
        resolvedRef.current = true
        navigate('/onboarding', {
          replace: true,
          state: buildOnboardingState('help'),
        })
        return
      }

      if (helperResumeTarget === 'journey') {
        clearHelperHomeIntent()
        resolvedRef.current = true
        navigate('/home', {
          replace: true,
          state: {
            mode: 'help',
            resumeHelperOnboarding: true,
          },
        })
        return
      }

      if (!profile || needsRequesterProfile(profile)) {
        clearHelperHomeIntent()
        resolvedRef.current = true
        navigate('/onboarding', {
          replace: true,
          state: buildOnboardingState(intent),
        })
        return
      }

      clearHelperHomeIntent()
      resolvedRef.current = true
      navigate('/home', {
        replace: true,
        state: buildHomeState(intent),
      })
    }

    resolveRedirect()
  }, [
    authTimeoutElapsed,
    hasAuthCallbackPayload,
    isConfigured,
    loading,
    navigate,
    intent,
    helperResumeTarget,
    profile,
    profileLoading,
    session,
    user,
  ])

  if (!isConfigured) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">Sesión</p>
        <h1>Comprobando acceso</h1>
        <p className="muted">Validando tu sesión, perfil e intención previa.</p>
      </section>
    </main>
  )
}
