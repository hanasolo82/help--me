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
  radiusKm = 10,
  selectedSkillId = 'all',
  onlyAvailable = false,
} = {}) {
  const center = useMemo(() => resolveCenter(profile, location), [location, profile])
  const canSearch = Boolean(center.hasValue)
  const excludeProfileId = profile?.id || null

  const query = useQuery({
    queryKey: ['available-helpers', excludeProfileId, center.lat, center.lng, radiusKm],
    queryFn: () =>
      getNearbyHelpers({
        lat: center.lat,
        lng: center.lng,
        radiusKm,
        excludeProfileId,
        limit: 16,
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

      if (selectedSkillId === 'all') {
        return true
      }

      return (helper.skills || []).some((skill) => {
        const skillId = skill?.category || skill?.name || skill?.id
        return skillId === selectedSkillId
      })
    })
  }, [onlyAvailable, query.data, selectedSkillId])

  return {
    center,
    hasLocation: canSearch,
    helpers,
    skillFilters,
    isLoading: query.isLoading && !query.data,
    error: query.error?.message || '',
    refetch: query.refetch,
  }
}
