import RatingSummary from '../../../reviews/components/RatingSummary'
import ReviewsList from '../../../reviews/components/ReviewsList'
import ProfileContentSection from '../ProfileContentSection'

export default function ProfileReviewsPanel({ profile, reviews = [] }) {
  return (
    <ProfileContentSection
      id="opiniones"
      eyebrow="Opiniones"
      title="Opiniones"
      lead="La reputación se construye con tareas reales y comentarios de otras personas."
    >
      <RatingSummary profile={profile} reviews={reviews} />
      <ReviewsList reviews={reviews} />
    </ProfileContentSection>
  )
}
