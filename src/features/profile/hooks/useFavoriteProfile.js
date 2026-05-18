import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toggleFavoriteProfile } from '../api/profileApi'

export function useFavoriteProfile(profileId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => toggleFavoriteProfile(profileId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['favorite-profile-ids'] }),
        queryClient.invalidateQueries({ queryKey: ['profile', profileId] }),
      ])
    },
  })
}

