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

function applyHelperFilters(tasks, { category, radius, location }) {
  return tasks
    .map((task) => ({
      task,
      distance: buildTaskDistance(task, location),
    }))
    .filter(({ task, distance }) => {
      if (category !== 'Todas' && task.category !== category) {
        return false
      }

      if (location && Number.isFinite(distance) && distance > radius) {
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

export function useTasks({ profile, mode, category, radius, location }) {
  const queryKey = ['tasks', profile?.id ?? null, mode, category, radius, location?.lat ?? null, location?.lng ?? null]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (mode === 'need') {
        return getMyTasks(profile?.id, { role: 'requester' })
      }

      return getAvailableTasksForHelper(profile, { category })
    },
    placeholderData: keepPreviousData,
  })

  const { visibleTasks, distancesById } = useMemo(() => {
    const rawTasks = query.data || []

    if (mode === 'need') {
      return {
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

    const filtered = applyHelperFilters(rawTasks, { category, radius, location })

    return {
      visibleTasks: filtered,
      distancesById: filtered.reduce((acc, item) => {
        if (Number.isFinite(item.distance)) {
          acc[item.task.id] = item.distance
        }
        return acc
      }, {}),
    }
  }, [category, location, mode, query.data, radius])

  return {
    ...query,
    tasks: query.data || [],
    visibleTasks,
    distancesById,
    error: query.error?.message || '',
  }
}
