import { useQuery } from '@tanstack/react-query'
import { getTaskById } from '../services/tasksService'

export function useTaskById(taskId) {
  const query = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => getTaskById(taskId),
    enabled: Boolean(taskId),
    staleTime: 30_000,
  })

  return {
    task: query.data || null,
    loading: query.isLoading && !query.data,
    error: query.error?.message || '',
    refetch: query.refetch,
  }
}

