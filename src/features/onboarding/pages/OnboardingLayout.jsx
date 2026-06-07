import { useEffect, useMemo, useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { getDetectedProvince, getProvinceForMunicipality } from '../utils/locationCatalog'
import {
  clearHelperOnboardingProgress,
  getHelperOnboardingStorageKey,
  readHelperOnboardingProgress,
  writeHelperOnboardingProgress,
} from '../../helper-onboarding/services/helperOnboardingProgress'
import styles from '../styles/onboarding.module.css'

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

function buildInitialDraft(user, profile, routeState, savedProgress) {
  const savedDraft = savedProgress?.draft && typeof savedProgress.draft === 'object' ? savedProgress.draft : {}
  const mode = routeState?.mode === 'help' || savedDraft.mode === 'help' ? 'help' : 'need'
  const fullNameSource = profile?.display_name || profile?.full_name || user?.user_metadata?.full_name || savedDraft.fullName || ''
  const fullNameParts = fullNameSource.trim().replace(/\s+/g, ' ').split(' ')
  const municipality =
    savedDraft.municipality ||
    profile?.city ||
    profile?.neighborhood ||
    savedDraft.city ||
    savedDraft.neighborhood ||
    ''
  const detectedProvince =
    savedDraft.province ||
    getProvinceForMunicipality(savedDraft.municipality || savedDraft.city || savedDraft.neighborhood) ||
    getProvinceForMunicipality(profile?.city || profile?.neighborhood) ||
    user?.user_metadata?.province ||
    user?.user_metadata?.region ||
    getDetectedProvince(profile?.country) ||
    ''
  const formattedAddress =
    savedDraft.formattedAddress ||
    savedDraft.displayLocation ||
    [municipality, detectedProvince, profile?.country || user?.user_metadata?.country].filter(Boolean).join(', ') ||
    ''

  return {
    mode,
    username: profile?.username || savedDraft.username || '',
    firstName: savedDraft.firstName || fullNameParts[0] || '',
    lastName: savedDraft.lastName || fullNameParts.slice(1).join(' ') || '',
    fullName: fullNameSource,
    province: detectedProvince,
    bio: profile?.bio || savedDraft.bio || '',
    municipality,
    displayLocation: formattedAddress,
    neighborhood: municipality,
    city: municipality,
    country: profile?.country || user?.user_metadata?.country || savedDraft.country || 'España',
    countryCode: profile?.country_code || savedDraft.countryCode || '',
    region: profile?.region || savedDraft.region || '',
    formattedAddress,
    placeId: savedDraft.placeId || '',
    lat: profile?.lat ?? savedDraft.lat ?? null,
    lng: profile?.lng ?? savedDraft.lng ?? null,
    helperEnabled: profile?.helper_enabled ?? savedDraft.helperEnabled ?? false,
    responseTimeMinutes: profile?.response_time_minutes ?? savedDraft.responseTimeMinutes ?? '',
    hourlyRate: profile?.hourly_rate ?? savedDraft.hourlyRate ?? '',
    availabilityEnabled: profile?.availability_enabled ?? savedDraft.availabilityEnabled ?? true,
    verifiedEmail: profile?.verified_email ?? savedDraft.verifiedEmail ?? Boolean(user?.email_confirmed_at),
    verifiedPhone: profile?.verified_phone ?? savedDraft.verifiedPhone ?? false,
    verifiedIdentity: profile?.verified_identity ?? savedDraft.verifiedIdentity ?? false,
    identityVerified: profile?.identity_verified ?? savedDraft.identityVerified ?? false,
    helperStatus:
      profile?.helper_status ?? savedDraft.helperStatus ?? (mode === 'help' ? 'profile_incomplete' : 'not_started'),
    selectedSkills: savedDraft.selectedSkills || [],
    selectedSkillRows: savedDraft.selectedSkillRows || [],
    availabilitySlots: savedDraft.availabilitySlots || [],
  }
}

export default function OnboardingLayout() {
  const { user, profile, refreshProfile, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const storageKey = useMemo(
    () => getHelperOnboardingStorageKey(user?.id),
    [user?.id],
  )
  const savedProgress = useMemo(() => readHelperOnboardingProgress(user?.id), [user?.id])
  const [draft, setDraft] = useState(() => buildInitialDraft(user, profile, location.state, savedProgress))
  const returnTo = location.state?.returnTo || savedProgress?.returnTo || '/home'
  const isHelperFlow = draft.mode === 'help'
  const activeSteps = isHelperFlow ? STEPS : STEPS.slice(0, 1)

  const stepIndex = getStepIndex(location.pathname)

  useEffect(() => {
    if (isHelperFlow && location.pathname === '/onboarding' && savedProgress?.path && savedProgress.path !== '/onboarding') {
      navigate(savedProgress.path, { replace: true })
    }
  }, [isHelperFlow, location.pathname, navigate, savedProgress?.path])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    writeHelperOnboardingProgress(storageKey, {
      userId: user.id,
      path: location.pathname,
      returnTo,
      draft,
      updatedAt: new Date().toISOString(),
    })
  }, [draft, location.pathname, returnTo, storageKey, user?.id])

  const contextValue = useMemo(
    () => ({
      draft,
      setDraft,
      steps: activeSteps,
      currentStep: stepIndex,
      goNext() {
        const nextStep = activeSteps[Math.min(stepIndex + 1, activeSteps.length - 1)]
        navigate(nextStep.path)
      },
      goBack() {
        const previousStep = activeSteps[Math.max(stepIndex - 1, 0)]
        navigate(previousStep.path)
      },
      finish() {
        clearHelperOnboardingProgress(user?.id)
        refreshProfile().finally(() => navigate(returnTo, { replace: true }))
      },
      refreshProfile,
    }),
    [activeSteps, draft, navigate, refreshProfile, returnTo, stepIndex, user?.id],
  )

  if (loading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <h1>Preparando tu perfil</h1>
          <p className="muted">Estamos validando tu sesión para construir el flujo de confianza.</p>
        </section>
      </main>
    )
  }

  if (profile && location.pathname === '/onboarding' && !isHelperFlow) {
    return <Navigate to="/home" replace />
  }

  return (
    <main className="auth-screen">
      <div className={styles.shell}>
        <Outlet context={contextValue} />
      </div>
    </main>
  )
}
