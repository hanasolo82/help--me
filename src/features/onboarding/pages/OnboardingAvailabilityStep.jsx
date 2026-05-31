import { Navigate, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { HELPER_STATUS } from '../../helper-onboarding/utils/helperPermissions'
import { replaceProfileAvailability } from '../api/onboardingApi'
import { updateCurrentProfile } from '../../../services/profilesService'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import styles from '../styles/onboarding.module.css'

const DAYS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

function buildDefaultSlots() {
  return DAYS.map((day) => ({
    day_of_week: day.value,
    active: false,
    start_time: '09:00',
    end_time: '18:00',
  }))
}

export default function OnboardingAvailabilityStep() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()
  const profileId = profile?.id

  const slots = useMemo(() => draft.availabilitySlots?.length ? draft.availabilitySlots : buildDefaultSlots(), [draft.availabilitySlots])

  const mutation = useMutation({
    mutationFn: (payload) => replaceProfileAvailability(profileId, payload.slots, payload.availabilityEnabled),
    onSuccess: async () => {
      if (draft.mode === 'help') {
        await updateCurrentProfile({
          helperStatus: HELPER_STATUS.TERMS_PENDING,
          allowHelperStatusUpdate: true,
        })
      }
      await refreshProfile()
      navigate('/onboarding/verification')
    },
  })

  function updateSlot(dayOfWeek, field, value) {
    setDraft((current) => ({
      ...current,
      availabilitySlots: slots.map((slot) =>
        slot.day_of_week === dayOfWeek
          ? {
              ...slot,
              [field]: field === 'active' ? value : value,
            }
          : slot,
      ),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    const activeSlots = slots
      .filter((slot) => slot.active)
      .map((slot) => ({
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
      }))

    mutation.mutate({
      slots: activeSlots,
      availabilityEnabled: activeSlots.length > 0,
    })
  }

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <OnboardingFrame
      title="Marca tu disponibilidad"
      lead="Un horario simple ayuda a que otros entiendan cuándo puedes responder o ayudar."
    >
      <form className={styles.stepBody} onSubmit={handleSubmit}>
        <div className={styles.slotGrid}>
          {slots.map((slot) => {
            const dayLabel = DAYS.find((day) => day.value === slot.day_of_week)?.label || 'Día'
            return (
              <article key={slot.day_of_week} className={styles.slotCard}>
                <label className="field">
                  <span>{dayLabel}</span>
                  <button
                    type="button"
                    className={slot.active ? 'primary-action' : 'secondary-action'}
                    onClick={() => updateSlot(slot.day_of_week, 'active', !slot.active)}
                  >
                    {slot.active ? 'Disponible' : 'Marcar disponible'}
                  </button>
                </label>

                {slot.active ? (
                  <div className={styles.split}>
                    <label className="field">
                      <span>Desde</span>
                      <input type="time" value={slot.start_time} onChange={(event) => updateSlot(slot.day_of_week, 'start_time', event.target.value)} />
                    </label>
                    <label className="field">
                      <span>Hasta</span>
                      <input type="time" value={slot.end_time} onChange={(event) => updateSlot(slot.day_of_week, 'end_time', event.target.value)} />
                    </label>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding/location')}>
            Volver
          </button>
          <button className="primary-action" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </form>
    </OnboardingFrame>
  )
}
