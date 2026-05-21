import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { saveOnboardingBasics } from '../api/onboardingApi'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import LocationAutocomplete from '../components/LocationAutocomplete'
import styles from '../styles/onboarding.module.css'

export default function OnboardingBasicsStep() {
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()
  const [submitError, setSubmitError] = useState('')

  const mutation = useMutation({
    mutationFn: (payload) => saveOnboardingBasics(payload, profile),
    onSuccess: async () => {
      void refreshProfile()
      navigate(draft.mode === 'help' ? '/onboarding/skills' : '/home')
    },
    onError: (error) => {
      setSubmitError(error?.message || 'No pudimos guardar tu perfil. Revisa los datos e inténtalo otra vez.')
    },
  })

  function updateField(field, value, maxLength = 120) {
    setDraft((current) => ({
      ...current,
      [field]: value.slice(0, maxLength),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')
    const fullName =
      [draft.firstName, draft.lastName].filter(Boolean).join(' ').trim() ||
      profile?.display_name ||
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.email?.split('@')?.[0] ||
      'Vecino'
    const municipality = draft.municipality || draft.city || draft.displayLocation || ''
    const country = draft.country || 'España'

    if (!municipality.trim()) {
      setSubmitError('Selecciona o escribe tu ubicación antes de continuar.')
      return
    }

    mutation.mutate({
      fullName,
      bio: draft.bio,
      neighborhood: municipality,
      city: draft.city || draft.municipality || municipality,
      country,
      lat: draft.lat,
      lng: draft.lng,
      helperEnabled: draft.helperEnabled,
      helperStatus: draft.helperStatus,
      searchRadiusKm: draft.searchRadiusKm,
      responseTimeMinutes: draft.responseTimeMinutes,
      hourlyRate: draft.hourlyRate,
      verifiedEmail: draft.verifiedEmail,
      verifiedPhone: draft.verifiedPhone,
      verifiedIdentity: draft.verifiedIdentity,
      identityVerified: draft.identityVerified,
    })
  }

  return (
<OnboardingFrame
  title="Crea tu perfil"
  lead="Configura tu perfil básico para entrar en la comunidad, encontrar ayuda cerca de ti y publicar tu primera solicitud."
  onBack={() => navigate(-1)}
  footer={
    <p className={styles.smallNote}>
      Más adelante podrás activar el modo ayudante y completar las verificaciones necesarias para aparecer en el mapa.
    </p>
  }
>
  <form className={styles.stepBody} onSubmit={handleSubmit}>
    <div className={styles.split}>
      <label className="field">
        <span>Nombre</span>
        <input
          value={draft.firstName}
          onChange={(event) =>
            updateField('firstName', event.target.value, 40)
          }
          placeholder="Mario"
        />
      </label>

      <label className="field">
        <span>Apellidos</span>
        <input
          value={draft.lastName}
          onChange={(event) =>
            updateField('lastName', event.target.value, 80)
          }
          placeholder="García López"
        />
      </label>
    </div>

    <label className="field">
      <span>Preséntate brevemente</span>
      <textarea
        value={draft.bio}
        onChange={(event) =>
          updateField('bio', event.target.value, 160)
        }
        placeholder="Busco ayuda puntual cerca de mi zona y también me interesa colaborar más adelante."
      />
    </label>

    <LocationAutocomplete draft={draft} setDraft={setDraft} />

    <div className={styles.actions}>
      <p className="muted">
        Solo te llevará un minuto. Podrás completar el resto de tu perfil más adelante.
      </p>

      {submitError ? (
        <p className="auth-message" role="alert">
          {submitError}
        </p>
      ) : null}

      <button
        className="primary-action"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Guardando...' : 'Continuar'}
      </button>
    </div>
  </form>
</OnboardingFrame>
  )
}
