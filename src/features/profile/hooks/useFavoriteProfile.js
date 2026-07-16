import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { getFavoriteProfileIds, toggleFavoriteProfile } from '../api/profileApi'

export function useFavoriteProfile(profileId) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = ['favorite-profile-ids', user?.id ?? null]
  const favoriteIdsQuery = useQuery({
    queryKey,
    queryFn: () => getFavoriteProfileIds(user?.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: () => toggleFavoriteProfile(profileId),
    onMutate: async () => {
      if (!user?.id || !profileId) return { previousIds: undefined }

      await queryClient.cancelQueries({ queryKey })
      const previousIds = queryClient.getQueryData(queryKey)
      const currentIds = Array.isArray(previousIds) ? previousIds : []
      const nextIds = currentIds.includes(profileId)
        ? currentIds.filter((id) => id !== profileId)
        : [...currentIds, profileId]

      queryClient.setQueryData(queryKey, nextIds)
      return { previousIds }
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKey, context?.previousIds)
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
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
