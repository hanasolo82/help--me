import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNearbyHelpers } from '../../../../features/profile/api/profileApi'

const DEFAULT_CENTER = { lat: 41.6523, lng: -0.9019 }

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function resolveCenter(profile, location) {
  const locationLat = toNumber(location?.lat)
  const locationLng = toNumber(location?.lng)
  if (locationLat !== null && locationLng !== null) {
    return { lat: locationLat, lng: locationLng, hasValue: true }
  }

  const profileLat = toNumber(profile?.lat)
  const profileLng = toNumber(profile?.lng)
  if (profileLat !== null && profileLng !== null) {
    return { lat: profileLat, lng: profileLng, hasValue: true }
  }

  return { ...DEFAULT_CENTER, hasValue: false }
}

function buildSkillFilters(helpers = []) {
  const seen = new Set()
  const filters = []

  for (const helper of helpers) {
    for (const skill of helper.skills || []) {
      const id = skill?.category || skill?.name || skill?.id
      if (!id || seen.has(id)) continue

      seen.add(id)
      filters.push({
        id,
        name: skill?.category || skill?.name || id,
        icon: skill?.icon || '🏷️',
      })
    }
  }

  return filters
}

export function useAvailableHelpers({
  profile,
  location,
  mapBounds = null,
  selectedSkillId = 'all',
  onlyAvailable = false,
} = {}) {
  const center = useMemo(() => resolveCenter(profile, location), [location, profile])
  const hasMapBounds = Boolean(
    Number.isFinite(Number(mapBounds?.north)) &&
      Number.isFinite(Number(mapBounds?.south)) &&
      Number.isFinite(Number(mapBounds?.east)) &&
      Number.isFinite(Number(mapBounds?.west)),
  )
  const skillFilter = selectedSkillId && selectedSkillId !== 'all' ? selectedSkillId : null
  const canSearch = hasMapBounds || Boolean(skillFilter)
  const excludeProfileId = profile?.id || null

  const query = useQuery({
    queryKey: [
      'available-helpers',
      excludeProfileId,
      center.lat,
      center.lng,
      mapBounds?.north ?? null,
      mapBounds?.south ?? null,
      mapBounds?.east ?? null,
      mapBounds?.west ?? null,
      skillFilter,
    ],
    queryFn: () =>
      getNearbyHelpers({
        lat: center.lat,
        lng: center.lng,
        bounds: hasMapBounds ? mapBounds : null,
        category: skillFilter,
        excludeProfileId,
        limit: 32,
      }),
    enabled: canSearch,
    staleTime: 30_000,
  })

  const skillFilters = useMemo(() => buildSkillFilters(query.data || []), [query.data])

  const helpers = useMemo(() => {
    const rawHelpers = query.data || []

    return rawHelpers.filter((helper) => {
      if (onlyAvailable && helper.availability_enabled === false) {
        return false
      }

      return true
    })
  }, [onlyAvailable, query.data])

  return {
    center,
    hasLocation: Boolean(center.hasValue),
    helpers,
    skillFilters,
    isLoading: query.isLoading && !query.data,
    error: query.error?.message || '',
    refetch: query.refetch,
  }
}
