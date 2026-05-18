import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { sanitizeText } from '../../../lib/security'
import { saveOnboardingBasics } from '../api/onboardingApi'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import OnboardingModeSelect from '../components/OnboardingModeSelect'
import styles from '../styles/onboarding.module.css'

export default function OnboardingBasicsStep() {
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()

  const mutation = useMutation({
    mutationFn: (payload) => saveOnboardingBasics(payload, profile),
    onSuccess: async () => {
      await refreshProfile()
      navigate('/onboarding/skills')
    },
  })

  function updateField(field, value, maxLength = 120) {
    setDraft((current) => ({
      ...current,
      [field]: sanitizeText(value, maxLength),
    }))
  }

  function handleModeChange(mode) {
    setDraft((current) => ({
      ...current,
      mode,
      helperEnabled: mode === 'help',
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    mutation.mutate({
      username: draft.username || user?.email?.split('@')?.[0] || '',
      fullName: draft.fullName,
      bio: draft.bio,
      neighborhood: draft.neighborhood,
      city: draft.city,
      country: draft.country,
      lat: draft.lat,
      lng: draft.lng,
      helperEnabled: draft.helperEnabled,
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
      title="Cuéntanos quién eres"
      lead="Creamos la identidad base del perfil antes de pasar a skills, ubicación y confianza."
      footer={<p className={styles.smallNote}>Puedes ajustar todo después desde Settings, pero aquí dejamos la base bien preparada.</p>}
    >
      <form className={styles.stepBody} onSubmit={handleSubmit}>
        <OnboardingModeSelect value={draft.mode} onChange={handleModeChange} />

        <div className={styles.split}>
          <label className="field">
            <span>Username único</span>
            <input value={draft.username} onChange={(event) => updateField('username', event.target.value, 30)} placeholder="mario_delicias" />
          </label>

          <label className="field">
            <span>Nombre visible</span>
            <input value={draft.fullName} onChange={(event) => updateField('fullName', event.target.value, 80)} placeholder="Mario García" />
          </label>
        </div>

        <label className="field">
          <span>Bio corta</span>
          <textarea value={draft.bio} onChange={(event) => updateField('bio', event.target.value, 160)} placeholder="Ayudo con recados y tareas pequeñas por mi barrio." />
        </label>

        <div className={styles.split}>
          <label className="field">
            <span>Barrio o zona</span>
            <input value={draft.neighborhood} onChange={(event) => updateField('neighborhood', event.target.value, 80)} placeholder="Zaragoza · Delicias" />
          </label>

          <label className="field">
            <span>Ciudad</span>
            <input value={draft.city} onChange={(event) => updateField('city', event.target.value, 80)} placeholder="Zaragoza" />
          </label>
        </div>

        <div className={styles.actions}>
          <p className="muted">Al continuar, creamos tu profile base y pasamos a elegir skills.</p>
          <button className="primary-action" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </form>
    </OnboardingFrame>
  )
}
