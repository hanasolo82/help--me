import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import {
  getProfileAvailability,
  getProfileById,
  getProfileReviews,
  getProfileSkills,
  getProfileVerifications,
} from '../api/profileApi'

export function useProfilePageData(profileId) {
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

  const isLoading =
    profileQuery.isPending ||
    skillsQuery.isPending ||
    reviewsQuery.isPending ||
    verificationsQuery.isPending ||
    availabilityQuery.isPending

  const error =
    profileQuery.error ||
    skillsQuery.error ||
    reviewsQuery.error ||
    verificationsQuery.error ||
    availabilityQuery.error ||
    null

  return {
    targetProfileId,
    isOwnProfile,
    profile: profileQuery.data,
    skills: skillsQuery.data ?? [],
    reviews: reviewsQuery.data ?? [],
    verifications: verificationsQuery.data,
    availability: availabilityQuery.data ?? [],
    isLoading,
    error,
  }
}
