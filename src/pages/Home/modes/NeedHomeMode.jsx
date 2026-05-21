import RequesterProfileGate from '../../../features/home/need-help/components/RequesterProfileGate'
import RequesterHome from '../../../features/home/need-help/components/RequesterHome'

export default function NeedHomeMode({ profile, location, locationStatus, locationError, onRequestLocation }) {
  return (
    <RequesterProfileGate profile={profile}>
      <RequesterHome
        profile={profile}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        onRequestLocation={onRequestLocation}
      />
    </RequesterProfileGate>
  )
}
