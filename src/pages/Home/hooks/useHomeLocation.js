import { useMemo } from 'react'
import { useUserLocation } from '../../../hooks/useUserLocation'
import { getAvatarInitial } from '../../../utils/avatar'

function getReadableLocationLabel(locationState, profile) {
  return (
    locationState.location?.label ||
    profile?.neighborhood ||
    profile?.city ||
    profile?.formatted_address ||
    profile?.country ||
    'Tu zona'
  )
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
