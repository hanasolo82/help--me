import { useMemo } from 'react'
import { useUserLocation } from '../../../hooks/useUserLocation'
import { getAvatarInitial } from '../../../utils/avatar'

export function useHomeLocation(profile) {
  const locationState = useUserLocation()

  const displayName = profile?.display_name || profile?.full_name || profile?.username || 'helpMe'
  const userInitial = getAvatarInitial(displayName)
  const locationLabel = locationState.location?.label || profile?.neighborhood || 'Activa tu ubicacion'
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
