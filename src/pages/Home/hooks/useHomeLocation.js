import { useMemo } from 'react'
import { useUserLocation } from '../../../hooks/useUserLocation'
import { getAvatarInitial } from '../../../utils/avatar'
import { getLocationLabel } from '../../../features/profile/utils/profileFormatters'

function getReadableLocationLabel(locationState, profile) {
  const profileLabel = getLocationLabel(profile)

  if (profile?.show_approx_location === false) {
    return profileLabel
  }

  return profile?.visible_zone_name || locationState.location?.label || profileLabel
}

export function useHomeLocation(profile) {
  const locationState = useUserLocation()

  const displayName = profile?.display_name || profile?.full_name || profile?.username || 'helpMe'
  const userInitial = getAvatarInitial(displayName)
  const locationLabel = getReadableLocationLabel(locationState, profile)
  const userAvatarUrl = profile?.map_avatar_url || profile?.avatar_url || null

  return useMemo(
    () => ({
      ...locationState,
      displayName,
      userInitial,
      locationLabel,
      userAvatarUrl,
    }),
    [displayName, locationLabel, locationState, userAvatarUrl, userInitial],
  )
}
