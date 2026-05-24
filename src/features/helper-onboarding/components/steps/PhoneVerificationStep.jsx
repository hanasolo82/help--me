import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../../contexts/useAuth'
import StepFrame from './StepFrame'
import styles from './PhoneVerificationStep.module.css'
import {
  getPhoneContact,
  savePhoneContact,
  skipPhoneContact,
  splitPhoneContactNumber,
} from '../../services/helperPhoneContactService'
import { helperOnboardingKeys } from '../../utils/helperOnboardingKeys'

function updateJourneyDraft(setJourneyDraft, patch) {
  if (typeof setJourneyDraft !== 'function') return

  setJourneyDraft((current) => ({
    ...current,
    ...patch,
  }))
}

function sanitizeEditablePhone(value) {
  return String(value ?? '').replace(/[^\d+\s()-]/g, '')
}

function normalizePrefixValue(value, fallback = '+34') {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  if (!digits) return fallback

  return `+${digits.slice(0, 4)}`
}

function buildCombinedPhone(prefix, phoneNumber) {
  const safePrefix = String(prefix ?? '+34').trim() || '+34'
  const safePhone = String(phoneNumber ?? '').trim()
  return `${safePrefix}${safePhone}`
}

export default function PhoneVerificationStep({ onNext, onBack, journeyDraft, setJourneyDraft }) {
  const { profile, refreshProfile } = useAuth()
  const queryClient = useQueryClient()
  const profileId = profile?.id
  const [draftState, setDraftState] = useState(null)
  const [feedback, setFeedback] = useState('')

  const phoneContactQuery = useQuery({
    queryKey: helperOnboardingKeys.phoneContact(profileId),
    queryFn: () => getPhoneContact(profileId),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  })

  const initialContact = (() => {
    const hasDraftContact =
      Boolean(journeyDraft) &&
      (Object.prototype.hasOwnProperty.call(journeyDraft, 'phoneNumber') ||
        Object.prototype.hasOwnProperty.call(journeyDraft, 'phonePrefix') ||
        Object.prototype.hasOwnProperty.call(journeyDraft, 'phoneStatus'))

    if (hasDraftContact) {
      const splitDraft = splitPhoneContactNumber(
        buildCombinedPhone(journeyDraft.phonePrefix || '+34', journeyDraft.phoneNumber || ''),
        journeyDraft.phonePrefix || '+34',
      )

      return {
        prefix: journeyDraft.phonePrefix || splitDraft.prefix,
        phoneNumber: splitDraft.phoneNumber,
        phoneStatus: journeyDraft.phoneStatus || 'not_provided',
      }
    }

    const splitRemote = splitPhoneContactNumber(phoneContactQuery.data?.phoneNumber || '')

    return {
      prefix: splitRemote.prefix,
      phoneNumber: splitRemote.phoneNumber,
      phoneStatus: phoneContactQuery.data?.phoneStatus || (phoneContactQuery.data?.phoneNumber ? 'provided' : 'not_provided'),
    }
  })()

  const currentContact = draftState ?? initialContact
  const hasPhoneInput = Boolean(currentContact.phoneNumber.trim())
  const isProvided = currentContact.phoneStatus === 'provided'
  const isVerified = currentContact.phoneStatus === 'verified'

  const mutation = useMutation({
    mutationFn: async ({ action, phoneNumber }) => {
      if (action === 'save') {
        return savePhoneContact(profileId, phoneNumber)
      }

      return skipPhoneContact(profileId)
    },
  })

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  function patchDraft(patch) {
    setDraftState((current) => ({
      ...(current ?? initialContact),
      ...patch,
    }))
    setFeedback('')
  }

  async function invalidateRelevantQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
      queryClient.invalidateQueries({ queryKey: ['profile-verifications', profileId] }),
      queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.verifications(profileId) }),
      queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.phoneContact(profileId) }),
      refreshProfile(),
    ])
  }

  async function handleSaveAndContinue() {
    if (!hasPhoneInput) {
      setFeedback('Introduce un teléfono válido o usa Añadir más tarde.')
      return
    }

    setFeedback('')

    try {
      const combinedPhone = buildCombinedPhone(currentContact.prefix, currentContact.phoneNumber)
      const result = await mutation.mutateAsync({ action: 'save', phoneNumber: combinedPhone })
      const nextSplit = splitPhoneContactNumber(result.phoneNumber || combinedPhone, currentContact.prefix)

      setDraftState({
        prefix: nextSplit.prefix,
        phoneNumber: nextSplit.phoneNumber,
        phoneStatus: result.phoneStatus,
      })

      updateJourneyDraft(setJourneyDraft, {
        phonePrefix: nextSplit.prefix,
        phoneNumber: result.phoneNumber,
        phoneStatus: result.phoneStatus,
      })

      await invalidateRelevantQueries()
      onNext?.()
    } catch (error) {
      setFeedback(error?.message || 'No pudimos guardar el teléfono ahora mismo.')
    }
  }

  async function handleSkip() {
    setFeedback('')

    try {
      const result = await mutation.mutateAsync({ action: 'skip' })
      setDraftState({
        prefix: currentContact.prefix || '+34',
        phoneNumber: '',
        phoneStatus: result.phoneStatus,
      })

      updateJourneyDraft(setJourneyDraft, {
        phonePrefix: currentContact.prefix || '+34',
        phoneNumber: '',
        phoneStatus: result.phoneStatus,
      })

      await invalidateRelevantQueries()
      onNext?.()
    } catch (error) {
      setFeedback(error?.message || 'No pudimos omitir el teléfono ahora mismo.')
    }
  }

  function handlePrefixChange(event) {
    patchDraft({
      prefix: normalizePrefixValue(sanitizeEditablePhone(event.target.value), currentContact.prefix || '+34'),
    })
  }

  function handlePhoneChange(event) {
    patchDraft({
      phoneNumber: sanitizeEditablePhone(event.target.value),
    })
  }

  return (
    <StepFrame
      kicker="Contacto"
      title="Añade un teléfono de contacto"
      lead="Lo usaremos solo para avisos importantes, soporte y recuperación de cuenta. No se mostrará públicamente en tu perfil."
      footer={
        <p className="muted">
          Este paso es opcional. Más adelante podrás verificar tu número para reforzar la confianza de tu perfil.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack} disabled={mutation.isPending}>
            Atrás
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleSaveAndContinue}
            disabled={!hasPhoneInput || mutation.isPending}
          >
            {mutation.isPending ? 'Guardando...' : 'Guardar y continuar'}
          </button>
          <button type="button" className="secondary-action" onClick={handleSkip} disabled={mutation.isPending}>
            Añadir más tarde
          </button>
        </>
      }
    >
      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.cardKicker}>Teléfono de contacto</p>
            <h3>Un canal privado para avisos y recuperación</h3>
          </div>

          {isProvided || isVerified ? (
            <span className={`${styles.statusBadge} ${isVerified ? styles.isVerified : styles.isProvided}`.trim()}>
              {isVerified ? 'Teléfono verificado' : 'Teléfono añadido · no verificado'}
            </span>
          ) : (
            <span className={styles.statusBadge}>Opcional</span>
          )}
        </div>

        <p className={styles.description}>
          Puede ayudarnos a contactarte si hay una incidencia con una solicitud o necesitas recuperar tu cuenta.
        </p>

        {phoneContactQuery.isError ? (
          <div className={styles.inlineNotice} role="alert">
            <p>No pudimos cargar el teléfono guardado. Puedes añadir uno nuevo o saltarlo.</p>
          </div>
        ) : null}

        {phoneContactQuery.isPending && !draftState ? (
          <p className={styles.loadingText} aria-live="polite">
            Comprobando si ya tienes un teléfono de contacto...
          </p>
        ) : null}

        <div className={styles.inputGroup}>
          <label className={styles.prefixField}>
            <span>Prefijo</span>
            <input
              type="text"
              inputMode="tel"
              autoComplete="tel-country-code"
              value={currentContact.prefix}
              onChange={handlePrefixChange}
              aria-label="Prefijo telefónico"
              placeholder="+34"
            />
          </label>

          <label className={styles.phoneField}>
            <span>Número</span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={currentContact.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="600 000 000"
            />
          </label>
        </div>

        <p className={styles.microcopy}>No aparecerá en tu perfil público.</p>

        {feedback ? (
          <p className={styles.errorText} role="alert">
            {feedback}
          </p>
        ) : null}
      </article>
    </StepFrame>
  )
}
