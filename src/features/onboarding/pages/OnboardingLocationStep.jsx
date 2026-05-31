import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { HELPER_STATUS } from '../../helper-onboarding/utils/helperPermissions'
import { sanitizeText } from '../../../lib/security'
import { useUserLocation } from '../../../hooks/useUserLocation'
import { updateCurrentProfile } from '../../../services/profilesService'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import styles from '../styles/onboarding.module.css'

export default function OnboardingLocationStep() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()
  const locationHook = useUserLocation()

  const mutation = useMutation({
    mutationFn: async () =>
      updateCurrentProfile({
        city: draft.city,
        country: draft.country,
        neighborhood: draft.neighborhood,
        lat: draft.lat,
        lng: draft.lng,
        showApproxLocation: true,
        allowExactLocationUpdate: true,
      }),
    onSuccess: async () => {
      if (draft.mode === 'help') {
        await updateCurrentProfile({
          helperStatus: HELPER_STATUS.IDENTITY_PENDING,
          allowHelperStatusUpdate: true,
        })
      }
      await refreshProfile()
      navigate('/onboarding/availability')
    },
  })

  function updateField(field, value, maxLength = 120) {
    setDraft((current) => ({
      ...current,
      [field]: sanitizeText(value, maxLength),
    }))
  }

  function useCurrentLocation() {
    locationHook.requestLocation()
  }

  function syncLocation() {
    if (!locationHook.location) return

    setDraft((current) => ({
      ...current,
      lat: locationHook.location.lat,
      lng: locationHook.location.lng,
      city: current.city || 'Mi ciudad',
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    mutation.mutate()
  }

  if (!profile?.id) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <OnboardingFrame
      title="Define tu zona"
      lead="La ubicación se usa para conectar con personas cercanas sin mostrar coordenadas públicas."
    >
      <form className={styles.stepBody} onSubmit={handleSubmit}>
        <div className={styles.locationRow}>
          <button type="button" className="secondary-action" onClick={useCurrentLocation}>
            {locationHook.status === 'loading' ? 'Buscando ubicación...' : 'Usar mi ubicación'}
          </button>

          {locationHook.status === 'denied' ? <p className={styles.smallNote}>{locationHook.error}</p> : null}
          {locationHook.status === 'error' ? <p className={styles.smallNote}>{locationHook.error}</p> : null}

          {locationHook.location ? (
            <div className={styles.summaryCard}>
              <strong>Ubicación lista para guardar</strong>
              <p className="muted">{locationHook.location.label}</p>
              <button type="button" className="secondary-action" onClick={syncLocation}>
                Usar esta ubicación
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.split}>
          <label className="field">
            <span>Ciudad</span>
            <input value={draft.city} onChange={(event) => updateField('city', event.target.value, 80)} placeholder="Zaragoza" />
          </label>

          <label className="field">
            <span>País</span>
            <input value={draft.country} onChange={(event) => updateField('country', event.target.value, 80)} placeholder="España" />
          </label>
        </div>

        <label className="field">
          <span>Barrio o referencia pública</span>
          <input value={draft.neighborhood} onChange={(event) => updateField('neighborhood', event.target.value, 80)} placeholder="Delicias" />
        </label>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding/skills')}>
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
