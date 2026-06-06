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

function buildProfileLocation({
  lat: rawLat,
  lng: rawLng,
  visibleZoneName,
  locationLabel,
  neighborhood,
  city,
  country,
}) {
  const lat = Number(rawLat)
  const lng = Number(rawLng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    lat,
    lng,
    accuracy: null,
    label: visibleZoneName || locationLabel || 'Tu zona',
    neighborhood: neighborhood || null,
    city: city || null,
    province: null,
    country: country || null,
    source: 'profile',
  }
}

export function useHomeLocation(profile) {
  const locationState = useUserLocation()

  const displayName = profile?.display_name || profile?.full_name || profile?.username || 'helpMe'
  const userInitial = getAvatarInitial(displayName)
  const locationLabel = getReadableLocationLabel(locationState, profile)
  const profileLocationLabel = getLocationLabel(profile)
  const userAvatarUrl = profile?.map_avatar_url || profile?.avatar_url || null
  const profileLocation = useMemo(
    () => buildProfileLocation({
      lat: profile?.lat,
      lng: profile?.lng,
      visibleZoneName: profile?.visible_zone_name,
      locationLabel: profileLocationLabel,
      neighborhood: profile?.neighborhood,
      city: profile?.city,
      country: profile?.country,
    }),
    [
      profile?.city,
      profile?.country,
      profile?.lat,
      profile?.lng,
      profile?.neighborhood,
      profile?.visible_zone_name,
      profileLocationLabel,
    ],
  )
  const effectiveLocation = locationState.location || profileLocation

  return useMemo(
    () => ({
      ...locationState,
      location: effectiveLocation,
      currentLocation: locationState.location,
      profileLocation,
      displayName,
      userInitial,
      locationLabel,
      userAvatarUrl,
    }),
    [displayName, effectiveLocation, locationLabel, locationState, profileLocation, userAvatarUrl, userInitial],
  )
}
