import { useTasks } from '../../../hooks/useTasks'

export function useHomeTasks({ profile, mode, category, location }) {
  const tasksQuery = useTasks({
    profile,
    mode,
    category,
    location,
  })

  return {
    visibleTasks: tasksQuery.visibleTasks,
    availableTasks: tasksQuery.availableTasks,
    distancesById: tasksQuery.distancesById,
    isTasksLoading: tasksQuery.isLoading,
    tasksError: tasksQuery.error,
    refetchTasks: tasksQuery.refetch,
  }
}
