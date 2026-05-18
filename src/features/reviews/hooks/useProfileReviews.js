import { useQuery } from '@tanstack/react-query'
import { getProfileReviews } from '../../profile/api/profileApi'

export function useProfileReviews(profileId) {
  return useQuery({
    queryKey: ['profile-reviews', profileId],
    queryFn: () => getProfileReviews(profileId),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  })
}

