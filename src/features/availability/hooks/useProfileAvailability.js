import { useQuery } from '@tanstack/react-query'
import { getProfileAvailability } from '../../profile/api/profileApi'

export function useProfileAvailability(profileId) {
  return useQuery({
    queryKey: ['profile-availability', profileId],
    queryFn: () => getProfileAvailability(profileId),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  })
}

