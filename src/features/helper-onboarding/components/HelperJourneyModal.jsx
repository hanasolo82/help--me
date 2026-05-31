import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { clearHelperJourneyProgress, readHelperJourneyProgress, writeHelperJourneyProgress } from '../services/helperJourneyStorage'
import {
  HELPER_STATUS,
  HELPER_TERMS_VERSION,
  canActivateHelper,
  getHelperActivationMissingRequirements,
} from '../utils/helperPermissions'
import { helperOnboardingKeys } from '../utils/helperOnboardingKeys'
import { updateCurrentProfile } from '../../../services/profilesService'
import { getProfileVerificationState } from '../../onboarding/api/onboardingApi'
import { getProfileSkills } from '../services/helperSkillsService'
import { getProfileAvailability } from '../services/helperAvailabilityService'
import { getPhoneContact } from '../services/helperPhoneContactService'
import {
  buildHelperJourneyDraft,
  getStepStatus,
  isStepCompleted,
  mergeHelperJourneyDraft,
} from '../utils/helperOnboardingState'
import styles from './HelperJourneyModal.module.css'
import WelcomeStep from './steps/WelcomeStep'
import BasicProfileStep from './steps/BasicProfileStep'
import LocationStep from './steps/LocationStep'
import SkillsStep from './steps/SkillsStep'
import AvailabilityStep from './steps/AvailabilityStep'
import PhoneVerificationStep from './steps/PhoneVerificationStep'
import IdentityStep from './steps/IdentityStep'
import TermsStep from './steps/TermsStep'

const STEPS = [
  { key: 'welcome', Component: WelcomeStep },
  { key: 'basic-profile', Component: BasicProfileStep },
  { key: 'location', Component: LocationStep },
  { key: 'skills', Component: SkillsStep },
  { key: 'availability', Component: AvailabilityStep },
  { key: 'phone', Component: PhoneVerificationStep },
  { key: 'identity', Component: IdentityStep },
  { key: 'terms', Component: TermsStep },
]

function injectPreferredStep(flowSteps, preferredStepKey) {
  if (!preferredStepKey) return flowSteps

  const existingIndex = flowSteps.findIndex((step) => step.key === preferredStepKey)
  if (existingIndex >= 0) return flowSteps

  const preferredStep = STEPS.find((step) => step.key === preferredStepKey)
  if (!preferredStep) return flowSteps

  const preferredOrder = STEPS.findIndex((step) => step.key === preferredStepKey)
  const before = flowSteps.filter((step) => STEPS.findIndex((entry) => entry.key === step.key) < preferredOrder)
  const after = flowSteps.filter((step) => STEPS.findIndex((entry) => entry.key === step.key) > preferredOrder)

  return [...before, preferredStep, ...after]
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function buildPendingProfileUpdates(profile, draft = {}) {
  const nextUpdates = {}
  const fullName =
    String(
      draft?.fullName ||
        [draft?.firstName, draft?.lastName].filter(Boolean).join(' ') ||
        profile?.display_name ||
        profile?.full_name ||
        '',
    ).trim() || null
  const bio = String(draft?.about || draft?.bio || '').trim() || null
  const neighborhood = String(draft?.neighborhood || draft?.activityPlace || '').trim() || null

  if (hasValue(fullName)) {
    nextUpdates.displayName = fullName
    nextUpdates.fullName = fullName
  }

  if (hasValue(bio)) {
    nextUpdates.bio = bio
  }

  if (hasValue(draft?.avatarUrl)) {
    nextUpdates.avatarUrl = draft.avatarUrl
  }

  if (hasValue(draft?.city)) {
    nextUpdates.city = draft.city
  }

  if (hasValue(neighborhood)) {
    nextUpdates.neighborhood = neighborhood
  }

  if (hasValue(draft?.country)) {
    nextUpdates.country = draft.country
  }

  if (Number.isFinite(Number(draft?.lat))) {
    nextUpdates.lat = Number(draft.lat)
    nextUpdates.allowExactLocationUpdate = true
  }

  if (Number.isFinite(Number(draft?.lng))) {
    nextUpdates.lng = Number(draft.lng)
    nextUpdates.allowExactLocationUpdate = true
  }

  if (Object.prototype.hasOwnProperty.call(draft, 'visibilityEnabled')) {
    nextUpdates.showApproxLocation = Boolean(draft.visibilityEnabled)
  }

  return nextUpdates
}

export default function HelperJourneyModal({ open, onClose, onFinish, preferredStepKey = null }) {
  const { profile, refreshProfile } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [journeyDraft, setJourneyDraft] = useState({})
  const [savingState, setSavingState] = useState('idle')
  const [error, setError] = useState('')
  const previouslyFocusedRef = useRef(null)

  const profileId = profile?.id

  const verificationQuery = useQuery({
    queryKey: helperOnboardingKeys.verifications(profileId),
    queryFn: () => getProfileVerificationState(profileId),
    enabled: Boolean(open && profileId),
    staleTime: 60_000,
  })

  const skillsQuery = useQuery({
    queryKey: helperOnboardingKeys.skills(profileId),
    queryFn: () => getProfileSkills(profileId),
    enabled: Boolean(open && profileId),
    staleTime: 60_000,
  })

  const availabilityQuery = useQuery({
    queryKey: helperOnboardingKeys.availability(profileId),
    queryFn: () => getProfileAvailability(profileId),
    enabled: Boolean(open && profileId),
    staleTime: 60_000,
  })

  const phoneContactQuery = useQuery({
    queryKey: helperOnboardingKeys.phoneContact(profileId),
    queryFn: () => getPhoneContact(profileId),
    enabled: Boolean(open && profileId),
    staleTime: 60_000,
  })

  const verificationState = useMemo(
    () => ({
      profileVerifications: verificationQuery.data ?? null,
      skills: skillsQuery.data ?? [],
      availability: availabilityQuery.data ?? [],
      phoneContact: phoneContactQuery.data ?? null,
    }),
    [availabilityQuery.data, phoneContactQuery.data, skillsQuery.data, verificationQuery.data],
  )

  const stripeState = useMemo(
    () => ({
      stripe_onboarding_completed: Boolean(profile?.stripe_onboarding_completed),
      stripe_charges_enabled: Boolean(profile?.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(profile?.stripe_payouts_enabled),
    }),
    [profile?.stripe_charges_enabled, profile?.stripe_onboarding_completed, profile?.stripe_payouts_enabled],
  )

  const helperDraftSeed = useMemo(
    () => buildHelperJourneyDraft(profile, verificationState),
    [profile, verificationState],
  )

  useEffect(() => {
    if (!open) return

    setJourneyDraft((current) => mergeHelperJourneyDraft(current, helperDraftSeed))
  }, [helperDraftSeed, open])

  const handleClose = useCallback(() => {
    if (onClose) onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      const previous = previouslyFocusedRef.current
      if (previous && typeof previous.focus === 'function') {
        previous.focus()
      }
    }
  }, [open, handleClose])

  const stepPlan = useMemo(
    () =>
      STEPS.map((step) => {
        const status = getStepStatus(profile, verificationState, stripeState, step.key)
        return {
          ...step,
          status,
          completed: isStepCompleted(profile, verificationState, stripeState, step.key),
        }
      }),
    [profile, stripeState, verificationState],
  )

  const actionableStepPlan = useMemo(
    () => stepPlan.filter((step) => step.key !== 'welcome'),
    [stepPlan],
  )

  const flowSteps = useMemo(() => {
    const pendingSteps = actionableStepPlan.filter((step) => step.status !== 'complete')
    const baseFlow = pendingSteps.length > 0 ? pendingSteps : actionableStepPlan.slice(-1)
    return injectPreferredStep(baseFlow, preferredStepKey)
  }, [actionableStepPlan, preferredStepKey])

  useEffect(() => {
    if (!open) return

    const savedProgress = readHelperJourneyProgress()
    const savedIndex = Number(savedProgress?.stepIndex)
    const savedDraft = savedProgress?.draft && typeof savedProgress.draft === 'object' ? savedProgress.draft : {}
    const preferredIndex = preferredStepKey
      ? flowSteps.findIndex((step) => step.key === preferredStepKey)
      : -1
    const nextStepIndex = preferredIndex >= 0
      ? preferredIndex
      : Number.isFinite(savedIndex)
        ? Math.max(savedIndex, 0)
        : 0

    queueMicrotask(() => {
      setStepIndex(nextStepIndex)
      setJourneyDraft(mergeHelperJourneyDraft(savedDraft, helperDraftSeed))
      setError('')
    })
  }, [flowSteps, helperDraftSeed, open, preferredStepKey])

  const currentStep = useMemo(() => flowSteps[stepIndex] || flowSteps[0] || STEPS[0], [flowSteps, stepIndex])
  const StepComponent = currentStep.Component
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === flowSteps.length - 1
  const completedCount = actionableStepPlan.filter((step) => step.status === 'complete').length
  const reviewCount = actionableStepPlan.filter((step) => step.status === 'review').length
  const pendingCount = actionableStepPlan.filter((step) => step.status === 'pending').length
  const progress = Math.round((completedCount / Math.max(actionableStepPlan.length, 1)) * 100)

  useEffect(() => {
    if (!open) return

    setStepIndex((current) => Math.min(current, Math.max(flowSteps.length - 1, 0)))
  }, [flowSteps.length, open])

  useEffect(() => {
    if (!open) return

    writeHelperJourneyProgress({
      stepIndex,
      draft: journeyDraft,
      updatedAt: new Date().toISOString(),
    })
  }, [journeyDraft, open, stepIndex])

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  function goNext() {
    if (isLastStep) {
      handleComplete()
      return
    }

    setStepIndex((current) => Math.min(current + 1, Math.max(flowSteps.length - 1, 0)))
  }

  function goBack() {
    if (isFirstStep) {
      handleClose()
      return
    }

    setStepIndex((current) => Math.max(current - 1, 0))
  }

  async function handleComplete() {
    setSavingState('saving')
    setError('')

    try {
      const now = new Date().toISOString()
      const pendingUpdates = {
        ...buildPendingProfileUpdates(profile, journeyDraft),
        termsAccepted: true,
        termsAcceptedAt: now,
        termsVersion: HELPER_TERMS_VERSION,
      }

      const savedProfile = await updateCurrentProfile(pendingUpdates)
      const mergedProfile = {
        ...profile,
        ...savedProfile,
        ...pendingUpdates,
        terms_accepted: true,
        terms_accepted_at: now,
        terms_version: HELPER_TERMS_VERSION,
      }
      const missingRequirements = getHelperActivationMissingRequirements(mergedProfile, journeyDraft)
      const canActivate = canActivateHelper(mergedProfile, journeyDraft)

      if (!canActivate) {
        setError(
          missingRequirements.length > 0
            ? `No hemos podido activar tu perfil porque falta: ${missingRequirements.join(', ')}`
            : 'Completa los pasos pendientes antes de activar tu perfil.',
        )
        await refreshProfile()
        return
      }

      await updateCurrentProfile({
        helperStatus: HELPER_STATUS.ACTIVE,
        helperEnabled: true,
        allowHelperStatusUpdate: true,
      })
      await refreshProfile()

      clearHelperJourneyProgress()
      onFinish?.()
    } catch (nextError) {
      setError(nextError?.message || 'No pudimos activar tu perfil de ayudante.')
    } finally {
      setSavingState('idle')
    }
  }

  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="helper-journey-modal-title"
      onMouseDown={handleBackdropClick}
    >
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <header className={styles.header}>
          <p className="eyebrow">Quiero ayudar</p>
          <h2 id="helper-journey-modal-title">Prepara tu perfil de ayudante</h2>
          <div className={styles.progress}>
            <strong>
              Paso {Math.min(stepIndex + 1, Math.max(flowSteps.length, 1))} de {Math.max(flowSteps.length, 1)}
            </strong>
            <div className={styles.bar}>
              <span className={styles.fill} style={{ width: `${progress}%` }} />
            </div>
            <p className={styles.recoveryCopy}>
              Ya hemos recuperado parte de tu información para que el proceso sea más rápido.
            </p>
            <div className={styles.statusRow} aria-label="Estado del onboarding">
              <span className={`${styles.statusPill} ${styles.statusComplete}`}>
                Completado {completedCount}
              </span>
              <span className={`${styles.statusPill} ${styles.statusReview}`}>
                Revisar {reviewCount}
              </span>
              <span className={`${styles.statusPill} ${styles.statusPending}`}>
                Pendiente {pendingCount}
              </span>
            </div>
          </div>
        </header>

        <StepComponent
          key={currentStep.key}
          profile={profile}
          onNext={goNext}
          onBack={goBack}
          onFinish={handleComplete}
          journeyDraft={journeyDraft}
          setJourneyDraft={setJourneyDraft}
          savingState={savingState}
          error={error}
          stepStatus={currentStep.status}
        />

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {savingState === 'saving' ? (
          <p className="muted" aria-live="polite">
            Guardando tu perfil de ayudante...
          </p>
        ) : null}
      </div>
    </div>
  )
}
