import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { getFavoriteProfiles } from '../api/profileApi'

export function favoriteProfileIdsQueryKey(userId) {
  return ['favorite-profile-ids', userId ?? null]
}

export function favoriteProfilesQueryKey(userId) {
  return ['favorite-profiles', userId ?? null]
}

export function useFavoriteProfiles() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  return useQuery({
    queryKey: favoriteProfilesQueryKey(userId),
    queryFn: () => getFavoriteProfiles(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
