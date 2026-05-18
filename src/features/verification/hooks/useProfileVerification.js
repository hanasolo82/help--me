import { useQuery } from '@tanstack/react-query'
import { getProfileVerifications } from '../../profile/api/profileApi'

export function useProfileVerification(profileId) {
  return useQuery({
    queryKey: ['profile-verifications', profileId],
    queryFn: () => getProfileVerifications(profileId),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  })
}

