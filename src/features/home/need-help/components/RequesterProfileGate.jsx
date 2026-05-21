import { useNavigate } from 'react-router-dom'
import HomeEmptyState from '../../components/HomeEmptyState'
import { needsRequesterProfile } from '../../../onboarding/utils/requesterPermissions'
import { setHelperHomeIntent } from '../../../helper-onboarding/services/helperIntentStorage'
import styles from './RequesterProfileGate.module.css'

export default function RequesterProfileGate({ profile, children }) {
  const navigate = useNavigate()

  if (!needsRequesterProfile(profile)) {
    return children
  }

  return (
    <section className={styles.gate}>
      <HomeEmptyState
        title="Completa tu perfil para publicar tu primera solicitud"
        description="Solo te pediremos lo mínimo para que la comunidad confíe en ti y tus solicitudes se entiendan mejor."
        actionLabel="Completar perfil"
        onAction={() => {
          setHelperHomeIntent('need')
          navigate('/onboarding', { state: { mode: 'need', returnTo: '/home' } })
        }}
        tone="warning"
      />

      <p className="muted">
        Tu perfil base nos ayuda a mostrar tu zona, tu nombre y un contexto claro antes de que publiques una solicitud.
      </p>
    </section>
  )
}
