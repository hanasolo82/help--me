import styles from '../../styles/profilePublicView.module.css'
import ProfileTrustMetrics from '../ProfileTrustMetrics'
import ProfileContentSection from '../ProfileContentSection'
import ProfileEditableRow from '../ProfileEditableRow'
import {
  formatHourlyRate,
  formatResponseTime,
  getLocationLabel,
  getProfileName,
  summarizeReviews,
} from '../../utils/profileFormatters'

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
        <ProfileEditableRow
          label="Respuesta"
          value={formatResponseTime(profile?.response_time_minutes)}
          meta="Media de respuesta orientativa."
        />
        <ProfileEditableRow
          label="Tarifa"
          value={formatHourlyRate(profile?.hourly_rate)}
          meta="Referencia pública estimada."
        />
      </div>

      <ProfileTrustMetrics profile={profile} reviewSummary={reviewSummary} />
    </ProfileContentSection>
  )
}
