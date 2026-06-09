import { requireUser } from '../../../lib/authHelpers'
import { sanitizeText } from '../../../lib/security'
import { supabase } from '../../../lib/supabaseClient'

const MAX_TAGS = 8
const MAX_TAG_LENGTH = 40

function normalizeRating(value) {
  const rating = Number(value)

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error('Elige una puntuacion entre 1 y 5.')
  }

  return rating
}

function normalizeTags(tags = []) {
  return [...new Set(tags.map((tag) => sanitizeText(tag, MAX_TAG_LENGTH)).filter(Boolean))].slice(0, MAX_TAGS)
}

export async function getMyReviewForTask(taskId, reviewedUserId = null) {
  if (!taskId) return null

  const user = await requireUser()
  let query = supabase
    .from('reviews')
    .select('id, task_id, reviewer_id, reviewed_user_id, rating, tags, comment, created_at, updated_at')
    .eq('task_id', taskId)
    .eq('reviewer_id', user.id)

  if (reviewedUserId) {
    query = query.eq('reviewed_user_id', reviewedUserId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getMyReviewsForTasks(taskIds = []) {
  const ids = [...new Set(taskIds.filter(Boolean))]

  if (ids.length === 0) {
    return []
  }

  const user = await requireUser()
  const { data, error } = await supabase
    .from('reviews')
    .select('id, task_id, reviewed_user_id')
    .eq('reviewer_id', user.id)
    .in('task_id', ids)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createTaskReview({
  taskId,
  reviewedUserId,
  rating,
  tags = [],
  comment = '',
}) {
  if (!taskId || !reviewedUserId) {
    throw new Error('Faltan datos de la tarea o del helper.')
  }

  const user = await requireUser('Necesitas iniciar sesion para valorar al helper.')
  const cleanRating = normalizeRating(rating)
  const cleanTags = normalizeTags(tags)
  const cleanComment = sanitizeText(comment, 600)

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      task_id: taskId,
      reviewer_id: user.id,
      reviewed_user_id: reviewedUserId,
      rating: cleanRating,
      communication_rating: cleanRating,
      punctuality_rating: cleanRating,
      trust_rating: cleanRating,
      comment: cleanComment || null,
      tags: cleanTags,
    })
    .select('id, task_id, reviewer_id, reviewed_user_id, rating, tags, comment, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Esta tarea ya fue valorada.')
    }

    throw error
  }

  return data
}
