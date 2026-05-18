import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { distanceKm } from '../services/locationService'
import { getMyTasks, getOpenTasks } from '../services/tasksService'

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
}

export function useTasks({ mode, category, radius, location }) {
  const queryKey = ['tasks', mode, category, radius, location?.lat ?? null, location?.lng ?? null]

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (mode === 'need') {
        return getMyTasks({ role: 'requester' })
      }

      return getOpenTasks({ category })
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

