import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { readHelperHomeIntent, clearHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { needsRequesterProfile } from '../../features/onboarding/utils/requesterPermissions'

function buildHomeState(intent) {
  return { mode: intent === 'help' ? 'help' : 'need' }
}

function buildOnboardingState(intent) {
  return {
    mode: intent === 'help' ? 'help' : 'need',
    returnTo: '/home',
  }
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const { isConfigured, session, user, profile, loading, profileLoading } = useAuth()
  const resolvedRef = useRef(false)
  const intent = readHelperHomeIntent()

  useDocumentMeta({
    title: 'Comprobando acceso',
    description: 'Estamos terminando de validar tu sesión.',
    path: '/auth/callback',
    noindex: true,
  })

  useEffect(() => {
    async function resolveRedirect() {
      if (!isConfigured || resolvedRef.current) {
        return
      }

      if (loading || profileLoading) {
        return
      }

      if (!session) {
        clearHelperHomeIntent()
        resolvedRef.current = true
        navigate('/', { replace: true })
        return
      }

      if (!user) {
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
  }, [isConfigured, loading, navigate, intent, profile, profileLoading, session, user])

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
