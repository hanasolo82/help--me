import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import {
  getFavoriteProfileIds,
  getNearbyHelpers,
  getProfileAvailability,
  getProfileById,
  getProfileReviews,
  getProfileSkills,
  getProfileVerifications,
} from '../api/profileApi'

export function useProfilePageData(profileId, { radiusKm = 10 } = {}) {
  const { user, profile: authProfile } = useAuth()
  const targetProfileId = profileId || user?.id || authProfile?.id || null
  const isOwnProfile = Boolean(targetProfileId && user?.id && targetProfileId === user.id)

  const profileQuery = useQuery({
    queryKey: ['profile', targetProfileId],
    queryFn: () => getProfileById(targetProfileId),
    enabled: Boolean(targetProfileId),
    staleTime: 30_000,
    initialData: isOwnProfile ? authProfile : undefined,
  })

  const skillsQuery = useQuery({
    queryKey: ['profile-skills', targetProfileId],
    queryFn: () => getProfileSkills(targetProfileId),
    enabled: Boolean(targetProfileId),
    staleTime: 60_000,
  })

  const reviewsQuery = useQuery({
    queryKey: ['profile-reviews', targetProfileId],
    queryFn: () => getProfileReviews(targetProfileId),
    enabled: Boolean(targetProfileId),
    staleTime: 30_000,
  })

  const verificationsQuery = useQuery({
    queryKey: ['profile-verifications', targetProfileId],
    queryFn: () => getProfileVerifications(targetProfileId),
    enabled: Boolean(targetProfileId),
    staleTime: 60_000,
  })

  const availabilityQuery = useQuery({
    queryKey: ['profile-availability', targetProfileId],
    queryFn: () => getProfileAvailability(targetProfileId),
    enabled: Boolean(targetProfileId),
    staleTime: 60_000,
  })

  const nearbyHelpersQuery = useQuery({
    queryKey: ['nearby-helpers', targetProfileId, profileQuery.data?.lat, profileQuery.data?.lng, radiusKm],
    queryFn: () =>
      getNearbyHelpers({
        lat: profileQuery.data?.lat,
        lng: profileQuery.data?.lng,
        radiusKm,
        excludeProfileId: targetProfileId,
      }),
    enabled: Boolean(profileQuery.data?.lat && profileQuery.data?.lng),
    staleTime: 30_000,
  })

  const favoriteIdsQuery = useQuery({
    queryKey: ['favorite-profile-ids', user?.id],
    queryFn: () => getFavoriteProfileIds(user?.id),
    enabled: Boolean(user?.id && !isOwnProfile),
    staleTime: 30_000,
  })

  const favoriteState = useMemo(() => {
    if (!targetProfileId || isOwnProfile) {
      return { isFavorite: false }
    }

    return {
      isFavorite: favoriteIdsQuery.data?.includes(targetProfileId) ?? false,
    }
  }, [favoriteIdsQuery.data, isOwnProfile, targetProfileId])

  const isLoading =
    profileQuery.isPending ||
    skillsQuery.isPending ||
    reviewsQuery.isPending ||
    verificationsQuery.isPending ||
    availabilityQuery.isPending ||
    nearbyHelpersQuery.isPending

  const error =
    profileQuery.error ||
    skillsQuery.error ||
    reviewsQuery.error ||
    verificationsQuery.error ||
    availabilityQuery.error ||
    nearbyHelpersQuery.error ||
    null

  return {
    targetProfileId,
    isOwnProfile,
    profile: profileQuery.data,
    skills: skillsQuery.data ?? [],
    reviews: reviewsQuery.data ?? [],
    verifications: verificationsQuery.data,
    availability: availabilityQuery.data ?? [],
    nearbyHelpers: nearbyHelpersQuery.data ?? [],
    favoriteState,
    isFavoriteLoading: favoriteIdsQuery.isPending,
    isLoading,
    error,
  }
}

