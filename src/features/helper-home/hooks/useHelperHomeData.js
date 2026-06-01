import { useQuery } from '@tanstack/react-query'
import { getHelperActivityTasks, getHelperFavoriteTaskIds, getHelperUpcomingTasks } from '../services/helperHomeService'

export function useHelperHomeData(profileId) {
  const upcomingTasksQuery = useQuery({
    queryKey: ['helper-home', 'upcoming', profileId ?? null],
    queryFn: () => getHelperUpcomingTasks(profileId),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  })

  const favoriteTaskIdsQuery = useQuery({
    queryKey: ['helper-home', 'favorites', profileId ?? null],
    queryFn: () => getHelperFavoriteTaskIds(profileId),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  })

  const activityTasksQuery = useQuery({
    queryKey: ['helper-home', 'activity', profileId ?? null],
    queryFn: () => getHelperActivityTasks(profileId),
    enabled: Boolean(profileId),
    staleTime: 30_000,
  })

  return {
    upcomingTasks: upcomingTasksQuery.data || [],
    activityTasks: activityTasksQuery.data || [],
    favoriteTaskIds: favoriteTaskIdsQuery.data || [],
    isLoading: upcomingTasksQuery.isLoading || favoriteTaskIdsQuery.isLoading || activityTasksQuery.isLoading,
    error: upcomingTasksQuery.error?.message || favoriteTaskIdsQuery.error?.message || activityTasksQuery.error?.message || '',
    refetch: async () => {
      await Promise.all([upcomingTasksQuery.refetch(), favoriteTaskIdsQuery.refetch(), activityTasksQuery.refetch()])
    },
  }
}
