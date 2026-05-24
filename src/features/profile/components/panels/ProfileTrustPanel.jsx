import VerificationBadges from '../../../verification/components/VerificationBadges'
import styles from '../../styles/profilePublicView.module.css'
import ProfileContentSection from '../ProfileContentSection'

export default function ProfileTrustPanel({ profile, verifications }) {
  return (
    <ProfileContentSection
      id="confianza"
      eyebrow="Confianza"
      title="Confianza"
      lead="Señales que ayudan a generar confianza antes de contactar."
    >
      <VerificationBadges profile={profile} verifications={verifications} />
    </ProfileContentSection>
  )
}
