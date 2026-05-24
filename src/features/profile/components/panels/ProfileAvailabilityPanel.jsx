import WeeklyAvailabilityGrid from '../../../availability/components/WeeklyAvailabilityGrid'
import ProfileContentSection from '../ProfileContentSection'
import { deriveAvailabilitySummary } from '../../utils/profileFormatters'

export default function ProfileAvailabilityPanel({ profile, availability = [] }) {
  return (
    <ProfileContentSection
      id="disponibilidad"
      eyebrow="Disponibilidad"
      title="Disponibilidad habitual"
      lead={deriveAvailabilitySummary(availability)}
    >
      <WeeklyAvailabilityGrid slots={availability} availabilityEnabled={profile?.availability_enabled} />
    </ProfileContentSection>
  )
}
