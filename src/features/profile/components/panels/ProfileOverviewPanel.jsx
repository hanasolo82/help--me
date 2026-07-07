import styles from '../../styles/profilePublicView.module.css'
import ProfileTrustMetrics from '../ProfileTrustMetrics'
import ProfileContentSection from '../ProfileContentSection'
import ProfileEditableRow from '../ProfileEditableRow'
import {
  getLocationLabel,
  getProfileName,
  summarizeReviews,
} from '../../utils/profileFormatters'

// Respuesta y Tarifa viven SOLO en la fila de stats (ProfileTrustMetrics):
// antes aparecían duplicadas también como filas individuales (QA).
export default function ProfileOverviewPanel({ profile, reviews = [] }) {
  const displayName = getProfileName(profile)
  const locationLabel = getLocationLabel(profile)
  const reviewSummary = summarizeReviews(reviews)

  return (
    <ProfileContentSection
      id="resumen"
      eyebrow="Sobre mí"
      title="Perfil de ayudante"
      lead="Una vista pública clara para entender quién es, en qué puede ayudar y qué señales de confianza aporta."
    >
      <div className={styles.sectionRows}>
        <ProfileEditableRow
          label={`Sobre ${displayName}`}
          value={profile?.bio || 'Aún no ha compartido una presentación pública.'}
          meta="Presentación visible para otras personas."
        />
        <ProfileEditableRow
          label="Ubicación"
          value={locationLabel}
          meta="Zona visible aproximada para proteger la privacidad."
        />
      </div>

      <ProfileTrustMetrics profile={profile} reviewSummary={reviewSummary} />
    </ProfileContentSection>
  )
}
