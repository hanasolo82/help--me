import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../../contexts/useAuth'
import StepFrame from './StepFrame'
import WeeklyAvailabilityDots from '../../../availability/components/WeeklyAvailabilityDots'
import { getProfileAvailability, replaceProfileAvailability } from '../../services/helperAvailabilityService'
import styles from './AvailabilityStep.module.css'
import { helperOnboardingKeys } from '../../utils/helperOnboardingKeys'

const WEEKDAYS = [1, 2, 3, 4, 5]
const WEEKEND = [6, 0]
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0]

function normalizeDays(days = []) {
  const uniqueDays = []

  for (const value of days) {
    const day = Number(value)
    if (!Number.isInteger(day) || day < 0 || day > 6) continue
    if (!uniqueDays.includes(day)) uniqueDays.push(day)
  }

  return uniqueDays.sort((a, b) => a - b)
}

function updateJourneyDraft(setJourneyDraft, patch) {
  if (typeof setJourneyDraft !== 'function') return

  setJourneyDraft((current) => ({
    ...current,
    ...patch,
  }))
}

function formatSummary(count) {
  if (count === 1) return 'Disponible 1 día por semana'
  return `Disponible ${count} días por semana`
}

export default function AvailabilityStep({ onNext, onBack, journeyDraft, setJourneyDraft }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const profileId = profile?.id
  const draftDays = Array.isArray(journeyDraft?.selectedDays) ? normalizeDays(journeyDraft.selectedDays) : null
  const [editedDays, setEditedDays] = useState(null)
  const [feedback, setFeedback] = useState('')

  const availabilityQuery = useQuery({
    queryKey: helperOnboardingKeys.availability(profileId),
    queryFn: () => getProfileAvailability(profileId),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  })

  const loadedDays = useMemo(
    () => normalizeDays((availabilityQuery.data ?? []).map((slot) => slot.day_of_week)),
    [availabilityQuery.data],
  )

  const mutation = useMutation({
    mutationFn: (days) => replaceProfileAvailability(profileId, days),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.availability(profileId) })
    },
  })

  const selectedDays = editedDays !== null ? editedDays : draftDays ?? loadedDays
  const selectedCount = selectedDays.length
  const canContinue = selectedCount > 0 && !mutation.isPending
  const isLoading = availabilityQuery.isPending && draftDays === null && editedDays === null

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  function persistDays(nextDays) {
    const normalizedDays = normalizeDays(nextDays)
    setEditedDays(normalizedDays)
    updateJourneyDraft(setJourneyDraft, {
      selectedDays: normalizedDays,
    })
    setFeedback('')
  }

  function toggleDay(day) {
    if (mutation.isPending || isLoading) return

    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((value) => value !== day)
      : [...selectedDays, day]

    persistDays(nextDays)
  }

  function applyPreset(days) {
    if (mutation.isPending || isLoading) return
    persistDays(days)
  }

  async function handleContinue() {
    if (!canContinue) {
      setFeedback('Selecciona al menos un día para continuar.')
      return
    }

    setFeedback('')

    try {
      await mutation.mutateAsync(selectedDays)
      updateJourneyDraft(setJourneyDraft, {
        selectedDays,
        availabilityEnabled: selectedDays.length > 0,
      })
      onNext?.()
    } catch (error) {
      setFeedback(error?.message || 'No pudimos guardar tu disponibilidad ahora mismo.')
    }
  }

  return (
    <StepFrame
      kicker="Disponibilidad"
      title="Elige los días en los que sueles estar disponible"
      lead="Mostraremos esta información en tu perfil para que las personas sepan cuándo pueden contar contigo."
      footer={
        <p className="muted">
          Podrás modificarlo cuando quieras. Más adelante podrás añadir franjas horarias concretas.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className="primary-action" onClick={handleContinue} disabled={!canContinue}>
            {mutation.isPending ? 'Guardando...' : 'Continuar'}
          </button>
        </>
      }
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <p className={styles.cardKicker}>Semana</p>
            <h3>Marca tus días habituales</h3>
          </div>

          <span className={styles.counter}>{selectedCount}/7</span>
        </div>

        {isLoading ? (
          <div className={styles.loadingState} aria-live="polite">
            <p>Cargando tu disponibilidad guardada...</p>
          </div>
        ) : availabilityQuery.isError ? (
          <div className={styles.errorState} role="alert">
            <p>No pudimos cargar tu disponibilidad ahora mismo.</p>
            <button type="button" className="secondary-action" onClick={() => availabilityQuery.refetch()}>
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <WeeklyAvailabilityDots selectedDays={selectedDays} size="md" interactive onToggle={toggleDay} />

            <div className={styles.presets} aria-label="Atajos de disponibilidad">
              <button type="button" className={styles.presetButton} onClick={() => applyPreset(WEEKDAYS)}>
                Entre semana
              </button>
              <button type="button" className={styles.presetButton} onClick={() => applyPreset(WEEKEND)}>
                Fines de semana
              </button>
              <button type="button" className={styles.presetButton} onClick={() => applyPreset(ALL_DAYS)}>
                Todos
              </button>
              <button type="button" className={styles.presetButton} onClick={() => applyPreset([])}>
                Limpiar
              </button>
            </div>

            <div className={styles.summaryRow}>
              <strong>{formatSummary(selectedCount)}</strong>
              <span>{selectedCount > 0 ? 'Puedes seguir cuando quieras.' : 'Necesitas elegir al menos un día.'}</span>
            </div>
          </>
        )}

        <p className={styles.feedback} aria-live="polite">
          {feedback || 'Aparecerás en el tablón cuando tu disponibilidad esté activa.'}
        </p>
      </div>
    </StepFrame>
  )
}
