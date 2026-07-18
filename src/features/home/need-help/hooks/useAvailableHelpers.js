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

function normalizeSkillFilters(selectedSkillIds = []) {
  if (!Array.isArray(selectedSkillIds)) {
    return selectedSkillIds && selectedSkillIds !== 'all' ? [selectedSkillIds] : []
  }

  return selectedSkillIds
    .filter((item) => item && item !== 'all')
    .map(String)
}

function helperMatchesAnySkill(helper, selectedSkillIds = []) {
  if (selectedSkillIds.length === 0) return true

  return (helper?.skills || []).some((skill) => {
    const skillId = skill?.category || skill?.name || skill?.id
    return selectedSkillIds.includes(skillId)
  })
}

export function useAvailableHelpers({
  profile,
  location,
  mapBounds = null,
  selectedSkillIds = [],
  searchQuery = '',
} = {}) {
  const center = useMemo(() => resolveCenter(profile, location), [location, profile])
  const normalizedSkillFilters = useMemo(() => normalizeSkillFilters(selectedSkillIds), [selectedSkillIds])
  const normalizedSearchQuery = String(searchQuery || '').trim().slice(0, 80)
  const hasMapBounds = Boolean(
    Number.isFinite(Number(mapBounds?.north)) &&
      Number.isFinite(Number(mapBounds?.south)) &&
      Number.isFinite(Number(mapBounds?.east)) &&
      Number.isFinite(Number(mapBounds?.west)),
  )
  const serverSkillFilter = normalizedSkillFilters.length === 1 ? normalizedSkillFilters[0] : null
  const canSearch = hasMapBounds || normalizedSkillFilters.length > 0 || normalizedSearchQuery.length >= 3
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
      normalizedSkillFilters.join('|'),
      normalizedSearchQuery,
    ],
    queryFn: () =>
      getNearbyHelpers({
        lat: center.lat,
        lng: center.lng,
        bounds: hasMapBounds ? mapBounds : null,
        category: serverSkillFilter,
        searchQuery: normalizedSearchQuery,
        excludeProfileId,
        limit: 32,
      }),
    enabled: canSearch,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  })

  const rawHelpers = useMemo(() => query.data || [], [query.data])
  const helpers = useMemo(
    () => rawHelpers.filter((helper) => helperMatchesAnySkill(helper, normalizedSkillFilters)),
    [normalizedSkillFilters, rawHelpers],
  )
  const skillFilters = useMemo(() => buildSkillFilters(rawHelpers), [rawHelpers])

  return {
    center,
    hasLocation: Boolean(center.hasValue),
    helpers,
    skillFilters,
    isLoading: query.isLoading && !query.data,
    isRefreshing: query.isFetching && Boolean(query.data),
    error: query.error?.message || '',
    refetch: query.refetch,
  }
}
