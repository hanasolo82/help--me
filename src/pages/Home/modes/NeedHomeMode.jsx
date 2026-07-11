import RequesterProfileGate from '../../../features/home/need-help/components/RequesterProfileGate'
import RequesterHome from '../../../features/home/need-help/components/RequesterHome'

export default function NeedHomeMode({
  profile,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
  requestsDrawerOpen,
  onOpenRequestsDrawer,
  onCloseRequestsDrawer,
  directHelper,
}) {
  return (
    <RequesterProfileGate profile={profile}>
      <RequesterHome
        profile={profile}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        onRequestLocation={onRequestLocation}
        requestsDrawerOpen={requestsDrawerOpen}
        onOpenRequestsDrawer={onOpenRequestsDrawer}
        onCloseRequestsDrawer={onCloseRequestsDrawer}
        directHelper={directHelper}
      />
    </RequesterProfileGate>
  )
}
