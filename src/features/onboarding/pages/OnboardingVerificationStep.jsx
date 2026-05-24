import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { saveProfileVerification } from '../api/onboardingApi'
import { HELPER_STATUS } from '../../helper-onboarding/utils/helperPermissions'
import { updateCurrentProfile } from '../../../services/profilesService'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import styles from '../styles/onboarding.module.css'

export default function OnboardingVerificationStep() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()
  const profileId = profile?.id

  const mutation = useMutation({
    mutationFn: (payload) => saveProfileVerification(profileId, payload),
    onSuccess: async () => {
      if (draft.mode === 'help') {
        await updateCurrentProfile({
          helperStatus: HELPER_STATUS.ACTIVE,
          helperEnabled: true,
        })
      }
      await refreshProfile()
      navigate('/home', { replace: true })
    },
  })

  function toggleField(field) {
    setDraft((current) => ({
      ...current,
      [field]: !current[field],
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
      mutation.mutate({
        email_verified: Boolean(user?.email_confirmed_at) || draft.verifiedEmail,
        phone_verified: draft.verifiedPhone,
        payment_verified: false,
        identity_verified: draft.identityVerified,
        background_checked: false,
        helper_status: draft.mode === 'help' ? HELPER_STATUS.ACTIVE : HELPER_STATUS.NOT_STARTED,
      })
  }

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <OnboardingFrame
      title="Último paso: confianza"
      lead="Preparamos las señales de verificación para que el perfil empiece con una base sólida."
    >
      <form className={styles.stepBody} onSubmit={handleSubmit}>
        <div className={styles.verificationChecklist}>
          <div className={styles.verificationItem}>
            <span>Email confirmado</span>
            <strong className={styles.verificationState}>{user?.email_confirmed_at || draft.verifiedEmail ? 'Listo' : 'Pendiente'}</strong>
          </div>

          <button type="button" className={draft.verifiedPhone ? 'primary-action' : 'secondary-action'} onClick={() => toggleField('verifiedPhone')}>
            {draft.verifiedPhone ? 'Teléfono preparado' : 'Añadir teléfono después'}
          </button>

          <button type="button" className={draft.identityVerified ? 'primary-action' : 'secondary-action'} onClick={() => toggleField('identityVerified')}>
            {draft.identityVerified ? 'Identidad preparada' : 'Identidad pendiente'}
          </button>

          <p className={styles.smallNote}>
            De momento no hacemos background checks ni verificación real por SMS. Dejamos la arquitectura lista para conectar esos procesos más adelante.
          </p>
        </div>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding/availability')}>
            Volver
          </button>
          <button className="primary-action" disabled={mutation.isPending}>
            {mutation.isPending ? 'Finalizando...' : 'Entrar a helpMe'}
          </button>
        </div>
      </form>
    </OnboardingFrame>
  )
}
