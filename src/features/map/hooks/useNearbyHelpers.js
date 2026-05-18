import { useQuery } from '@tanstack/react-query'
import { getNearbyHelpers } from '../../profile/api/profileApi'

export function useNearbyHelpers({ profileId, lat, lng, radiusKm = 10 }) {
  return useQuery({
    queryKey: ['nearby-helpers', profileId, lat, lng, radiusKm],
    queryFn: () => getNearbyHelpers({ lat, lng, radiusKm, excludeProfileId: profileId }),
    enabled: Boolean(lat && lng),
    staleTime: 30_000,
  })
}

