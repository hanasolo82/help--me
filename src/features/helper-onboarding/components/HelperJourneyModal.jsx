import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../contexts/useAuth'
import { clearHelperJourneyProgress, readHelperJourneyProgress, writeHelperJourneyProgress } from '../services/helperJourneyStorage'
import { HELPER_STATUS } from '../utils/helperPermissions'
import { updateCurrentProfile } from '../../../services/profilesService'
import styles from './HelperJourneyModal.module.css'
import WelcomeStep from './steps/WelcomeStep'
import BasicProfileStep from './steps/BasicProfileStep'
import LocationStep from './steps/LocationStep'
import SkillsStep from './steps/SkillsStep'
import AvailabilityStep from './steps/AvailabilityStep'
import PhoneVerificationStep from './steps/PhoneVerificationStep'
import IdentityStep from './steps/IdentityStep'
import TermsStep from './steps/TermsStep'
import ReviewPendingStep from './steps/ReviewPendingStep'

const STEPS = [
  { key: 'welcome', Component: WelcomeStep },
  { key: 'basic-profile', Component: BasicProfileStep },
  { key: 'location', Component: LocationStep },
  { key: 'skills', Component: SkillsStep },
  { key: 'availability', Component: AvailabilityStep },
  { key: 'phone', Component: PhoneVerificationStep },
  { key: 'identity', Component: IdentityStep },
  { key: 'terms', Component: TermsStep },
  { key: 'review', Component: ReviewPendingStep },
]

export default function HelperJourneyModal({ open, onClose, onFinish }) {
  const { refreshProfile } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [journeyDraft, setJourneyDraft] = useState({})
  const [savingState, setSavingState] = useState('idle')
  const [error, setError] = useState('')
  const previouslyFocusedRef = useRef(null)

  useEffect(() => {
    if (open) {
      const savedProgress = readHelperJourneyProgress()
      const savedIndex = Number(savedProgress?.stepIndex)
      const savedDraft = savedProgress?.draft && typeof savedProgress.draft === 'object' ? savedProgress.draft : {}
      const nextStepIndex = Number.isFinite(savedIndex) ? Math.min(Math.max(savedIndex, 0), STEPS.length - 1) : 0

      queueMicrotask(() => {
        setStepIndex(nextStepIndex)
        setJourneyDraft(savedDraft)
        setError('')
      })
    }
  }, [open])

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

  const currentStep = useMemo(() => STEPS[stepIndex] || STEPS[0], [stepIndex])
  const StepComponent = currentStep.Component
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === STEPS.length - 1
  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100)

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

    setStepIndex((current) => Math.min(current + 1, STEPS.length - 1))
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
      await updateCurrentProfile({
        helperStatus: HELPER_STATUS.UNDER_REVIEW,
        helperEnabled: false,
        visibilityEnabled: Boolean(journeyDraft?.visibilityEnabled),
        lat: journeyDraft?.lat ?? null,
        lng: journeyDraft?.lng ?? null,
      })
      await refreshProfile()
      clearHelperJourneyProgress()
      onFinish?.()
    } catch (nextError) {
      setError(nextError?.message || 'No pudimos guardar el perfil de ayudante.')
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
            <strong>Paso {stepIndex + 1} de {STEPS.length}</strong>
            <div className={styles.bar}>
              <span className={styles.fill} style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <StepComponent
          key={currentStep.key}
          onNext={goNext}
          onBack={goBack}
          onFinish={handleComplete}
          journeyDraft={journeyDraft}
          setJourneyDraft={setJourneyDraft}
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
