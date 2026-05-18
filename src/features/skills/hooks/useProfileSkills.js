import { useQuery } from '@tanstack/react-query'
import { getProfileSkills } from '../../profile/api/profileApi'

export function useProfileSkills(profileId) {
  return useQuery({
    queryKey: ['profile-skills', profileId],
    queryFn: () => getProfileSkills(profileId),
    enabled: Boolean(profileId),
    staleTime: 60_000,
  })
}

