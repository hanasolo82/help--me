import { useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import styles from '../styles/onboarding.module.css'
import OnboardingProgress from '../components/OnboardingProgress'

const STEPS = [
  { key: 'basics', path: '/onboarding', label: 'Perfil' },
  { key: 'skills', path: '/onboarding/skills', label: 'Skills' },
  { key: 'location', path: '/onboarding/location', label: 'Ubicación' },
  { key: 'availability', path: '/onboarding/availability', label: 'Disponibilidad' },
  { key: 'verification', path: '/onboarding/verification', label: 'Verificación' },
]

function getStepIndex(pathname) {
  const index = STEPS.findIndex((step) => pathname === step.path || pathname.startsWith(`${step.path}/`))
  return index === -1 ? 0 : index
}

function buildInitialDraft(user, profile, routeState) {
  const defaultMode = routeState?.mode === 'need' ? 'need' : 'help'
  return {
    mode: defaultMode,
    username: profile?.username || '',
    fullName: profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || '',
    bio: profile?.bio || '',
    neighborhood: profile?.neighborhood || '',
    city: profile?.city || user?.user_metadata?.city || '',
    country: profile?.country || user?.user_metadata?.country || '',
    lat: profile?.lat ?? null,
    lng: profile?.lng ?? null,
    helperEnabled: profile?.helper_enabled ?? defaultMode === 'help',
    searchRadiusKm: profile?.search_radius_km ?? 10,
    responseTimeMinutes: profile?.response_time_minutes ?? '',
    hourlyRate: profile?.hourly_rate ?? '',
    availabilityEnabled: profile?.availability_enabled ?? true,
    verifiedEmail: profile?.verified_email ?? Boolean(user?.email_confirmed_at),
    verifiedPhone: profile?.verified_phone ?? false,
    verifiedIdentity: profile?.verified_identity ?? false,
    identityVerified: profile?.identity_verified ?? false,
    selectedSkills: [],
    selectedSkillRows: [],
    availabilitySlots: [],
  }
}

export default function OnboardingLayout() {
  const { user, profile, refreshProfile, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => buildInitialDraft(user, profile, location.state))

  const stepIndex = getStepIndex(location.pathname)

  const contextValue = useMemo(
    () => ({
      draft,
      setDraft,
      steps: STEPS,
      currentStep: stepIndex,
      goNext() {
        const nextStep = STEPS[Math.min(stepIndex + 1, STEPS.length - 1)]
        navigate(nextStep.path)
      },
      goBack() {
        const previousStep = STEPS[Math.max(stepIndex - 1, 0)]
        navigate(previousStep.path)
      },
      finish() {
        refreshProfile().finally(() => navigate('/home', { replace: true }))
      },
      refreshProfile,
    }),
    [draft, navigate, refreshProfile, stepIndex],
  )

  if (loading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Onboarding</p>
          <h1>Preparando tu perfil</h1>
          <p className="muted">Estamos validando tu sesión para construir el flujo de confianza.</p>
        </section>
      </main>
    )
  }

  if (profile && location.pathname === '/onboarding') {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="auth-screen">
      <div className={styles.shell}>
        <OnboardingProgress steps={STEPS} currentStep={stepIndex} />
        <Outlet context={contextValue} />
      </div>
    </main>
  )
}
