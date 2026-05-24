import { useTasks } from '../../../hooks/useTasks'

export function useHomeTasks({ profile, mode, category, radius, location }) {
  const tasksQuery = useTasks({
    profile,
    mode,
    category,
    radius,
    location,
  })

  return {
    visibleTasks: tasksQuery.visibleTasks,
    distancesById: tasksQuery.distancesById,
    isTasksLoading: tasksQuery.isLoading,
    tasksError: tasksQuery.error,
    refetchTasks: tasksQuery.refetch,
  }
}
