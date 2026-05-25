import { getMyTasks } from '../../../services/tasksService'

function sortUpcomingTasks(tasks = []) {
  return [...tasks].sort((left, right) => {
    const leftDate = new Date(left.published_at || left.updated_at || left.created_at || 0).getTime()
    const rightDate = new Date(right.published_at || right.updated_at || right.created_at || 0).getTime()

    if (leftDate !== rightDate) {
      return rightDate - leftDate
    }

    return String(left.id || '').localeCompare(String(right.id || ''))
  })
}

export async function getHelperUpcomingTasks(profileId) {
  if (!profileId) return []

  const tasks = await getMyTasks(profileId, { role: 'helper' })
  return sortUpcomingTasks(tasks.filter((task) => ['assigned', 'in_progress'].includes(task.status)))
}

export async function getHelperActivityTasks(profileId) {
  if (!profileId) return []

  return getMyTasks(profileId, { role: 'helper' })
}

export async function getHelperFavoriteTaskIds(profileId) {
  if (!profileId) return []

  return []
}
