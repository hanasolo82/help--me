import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { getFavoriteProfileIds, toggleFavoriteProfile } from '../api/profileApi'
import { favoriteProfileIdsQueryKey, favoriteProfilesQueryKey } from './useFavoriteProfiles'

export function useFavoriteProfile(profileId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = favoriteProfileIdsQueryKey(user?.id)
  const profilesQueryKey = favoriteProfilesQueryKey(user?.id)
  const favoriteIdsQuery = useQuery({
    queryKey,
    queryFn: () => getFavoriteProfileIds(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: () => toggleFavoriteProfile(profileId),
    onMutate: async () => {
      if (!user?.id || !profileId) return { previousIds: undefined, previousProfiles: undefined }

      await Promise.all([
        queryClient.cancelQueries({ queryKey }),
        queryClient.cancelQueries({ queryKey: profilesQueryKey }),
      ])
      const previousIds = queryClient.getQueryData(queryKey)
      const previousProfiles = queryClient.getQueryData(profilesQueryKey)
      const currentIds = Array.isArray(previousIds) ? previousIds : []
      const nextIds = currentIds.includes(profileId)
        ? currentIds.filter((id) => id !== profileId)
        : [...currentIds, profileId]

      queryClient.setQueryData(queryKey, nextIds)
      if (Array.isArray(previousProfiles) && currentIds.includes(profileId)) {
        queryClient.setQueryData(
          profilesQueryKey,
          previousProfiles.filter((profile) => profile.id !== profileId),
        )
      }

      return { previousIds, previousProfiles }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousIds)
      queryClient.setQueryData(profilesQueryKey, context?.previousProfiles)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: profilesQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['profile', profileId] }),
      ])
    },
  })

  return {
    ...mutation,
    isFavorite: favoriteIdsQuery.data?.includes(profileId) ?? false,
    isLoading: favoriteIdsQuery.isPending,
  }
}
