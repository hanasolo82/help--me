import styles from '../../styles/profilePublicView.module.css'
import ProfileTrustMetrics from '../ProfileTrustMetrics'
import ProfileContentSection from '../ProfileContentSection'
import ProfileEditableRow from '../ProfileEditableRow'
import { getProfileName, summarizeReviews } from '../../utils/profileFormatters'

// Sin fila de Ubicación ni métrica de Valoración: ambas viven SOLO en el aside.
// Aquí quedan la bio y las métricas que el aside no muestra (Opiniones, Tareas,
// Respuesta, Tarifa — ver buildTrustMetricItems).
export default function ProfileOverviewPanel({ profile, reviews = [], isEditing = false, onEditIdentity }) {
  const displayName = getProfileName(profile)
  const reviewSummary = summarizeReviews(reviews)

  return (
    <ProfileContentSection
      id="resumen"
      eyebrow="Sobre mí"
      title="Perfil de ayudante"
      lead="Una vista pública clara para entender quién es, en qué puede ayudar y qué señales de confianza aporta."
      actionLabel={isEditing ? 'Editar identidad en Ajustes' : null}
      onAction={isEditing ? onEditIdentity : null}
    >
      <div className={styles.sectionRows}>
        <ProfileEditableRow
          label={`Sobre ${displayName}`}
          value={profile?.bio || 'Aún no ha compartido una presentación pública.'}
          meta="Presentación visible para otras personas."
        />
      </div>

      <ProfileTrustMetrics profile={profile} reviewSummary={reviewSummary} />
    </ProfileContentSection>
  )
}
