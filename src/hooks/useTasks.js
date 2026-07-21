import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { distanceKm } from '../services/locationService'
import { getAvailableTasksForHelper, getMyTasks } from '../services/tasksService'

function buildTaskDistance(task, location) {
  if (!location) {
    return null
  }

  return distanceKm(
    { latitude: location.lat, longitude: location.lng },
    { latitude: task.lat, longitude: task.lng },
  )
}

function applyHelperFilters(tasks, { category, location }) {
  return tasks
    .map((task) => ({
      task,
      distance: buildTaskDistance(task, location),
    }))
    .filter(({ task }) => {
      if (task.is_direct_request) {
        return true
      }

      if (category !== 'Todas' && task.category !== category) {
        return false
      }

      return true
    })
    .sort((left, right) => {
      const leftDistance = Number(left.distance)
      const rightDistance = Number(right.distance)
      const hasLeftDistance = Number.isFinite(leftDistance)
      const hasRightDistance = Number.isFinite(rightDistance)

      if (hasLeftDistance && hasRightDistance && leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      if (hasLeftDistance !== hasRightDistance) {
        return hasLeftDistance ? -1 : 1
      }

      const leftDate = new Date(left.task.published_at || left.task.created_at || 0).getTime()
      const rightDate = new Date(right.task.published_at || right.task.created_at || 0).getTime()

      if (leftDate !== rightDate) {
        return rightDate - leftDate
      }

      return String(left.task.id || '').localeCompare(String(right.task.id || ''))
    })
}

export function useTasks({ profile, mode, category, location }) {
  const queryKey = [
    'tasks',
    profile?.id ?? null,
    mode,
    location?.lat ?? null,
    location?.lng ?? null,
  ]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (mode === 'need') {
        return getMyTasks(profile?.id, { role: 'requester' })
      }

      return getAvailableTasksForHelper(profile)
    },
    placeholderData: keepPreviousData,
  })

  const { availableTasks, visibleTasks, distancesById } = useMemo(() => {
    const rawTasks = query.data || []

    if (mode === 'need') {
      return {
        availableTasks: rawTasks.map((task) => ({
          task,
          distance: buildTaskDistance(task, location),
        })),
        visibleTasks: rawTasks.map((task) => ({
          task,
          distance: buildTaskDistance(task, location),
        })),
        distancesById: rawTasks.reduce((acc, task) => {
          const distance = buildTaskDistance(task, location)
          if (Number.isFinite(distance)) {
            acc[task.id] = distance
          }
          return acc
        }, {}),
      }
    }

    const available = rawTasks.map((task) => ({
      task,
      distance: buildTaskDistance(task, location),
    }))
    const filtered = applyHelperFilters(rawTasks, { category, location })

    return {
      availableTasks: available,
      visibleTasks: filtered,
      distancesById: filtered.reduce((acc, item) => {
        if (Number.isFinite(item.distance)) {
          acc[item.task.id] = item.distance
        }
        return acc
      }, {}),
    }
  }, [category, location, mode, query.data])

  return {
    ...query,
    tasks: query.data || [],
    availableTasks,
    visibleTasks,
    distancesById,
    error: query.error?.message || '',
  }
}
