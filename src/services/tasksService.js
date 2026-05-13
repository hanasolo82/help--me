import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

// Valores permitidos por frontend y por la constraint SQL de Supabase. Si anades una categoria, cambia ambos sitios.
export const allowedCategories = ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
export const allowedUrgencies = ['Ahora', 'Hoy', 'Flexible']

// Selecciona la tarea con el requester y el helper anidados para listarlos sin queries extra.
const TASK_SELECT = `
  id,
  requester_id,
  helper_id,
  title,
  description,
  category,
  price_cents,
  urgency,
  status,
  latitude,
  longitude,
  image_url,
  created_at,
  completed_at,
  requester:profiles!tasks_requester_id_fkey ( id, username, full_name, avatar_url, rating, completed_tasks, neighborhood ),
  helper:profiles!tasks_helper_id_fkey ( id, username, full_name, avatar_url, rating, completed_tasks )
`

// Valida y limpia los datos antes de enviarlos a Supabase. Esto no sustituye RLS ni constraints SQL.
export function validateTaskInput(input) {
  const title = sanitizeText(input.title, 90)
  const description = sanitizeText(input.description, 600)
  const category = sanitizeText(input.category, 40)
  const urgency = sanitizeText(input.urgency, 20)
  const priceCents = Number(input.priceCents)
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)
  const imageUrl = input.imageUrl ? sanitizeText(input.imageUrl, 500) : null

  const errors = []

  if (title.length < 3) errors.push('El titulo debe tener al menos 3 caracteres.')
  if (description.length < 3) errors.push('La descripcion debe tener al menos 3 caracteres.')
  if (!allowedCategories.includes(category)) errors.push('Categoria no permitida.')
  if (!allowedUrgencies.includes(urgency)) errors.push('Urgencia no permitida.')
  if (!Number.isInteger(priceCents) || priceCents < 0 || priceCents > 50000) errors.push('Precio no valido.')
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) errors.push('Latitud no valida.')
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) errors.push('Longitud no valida.')

  return {
    isValid: errors.length === 0,
    errors,
    value: {
      title,
      description,
      category,
      urgency,
      price_cents: priceCents,
      latitude,
      longitude,
      image_url: imageUrl || null,
    },
  }
}

// Crea una tarea real en Supabase usando el usuario autenticado como requester_id.
export async function createTask(input) {
  assertSupabaseReady()
  const validation = validateTaskInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion para publicar una tarea.')
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...validation.value,
      requester_id: userData.user.id,
    })
    .select(TASK_SELECT)
    .single()

  if (error) {
    throw error
  }

  return data
}

// Lista tareas abiertas que NO son del usuario actual (vista del helper).
export async function getOpenTasks({ category } = {}) {
  assertSupabaseReady()

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData?.user?.id

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (userId) {
    query = query.neq('requester_id', userId)
  }

  if (category && category !== 'Todas') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data
}

// Tareas del usuario autenticado, sea como requester o como helper.
export async function getMyTasks({ role = 'requester' } = {}) {
  assertSupabaseReady()

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion.')
  }

  const column = role === 'helper' ? 'helper_id' : 'requester_id'

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq(column, userData.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

// Lee una tarea por id con sus perfiles asociados.
export async function getTaskById(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

// Acepta una tarea abierta: asigna helper_id y crea el chat correspondiente en una sola operacion logica.
// Si la insercion del chat falla, revierte el helper_id para que la tarea quede disponible.
export async function acceptTask(taskId) {
  assertSupabaseReady()

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion para aceptar una tarea.')
  }

  const helperId = userData.user.id

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .update({
      helper_id: helperId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'open')
    .is('helper_id', null)
    .neq('requester_id', helperId)
    .select(TASK_SELECT)
    .maybeSingle()

  if (taskError) {
    throw taskError
  }

  if (!task) {
    throw new Error('La tarea ya no esta disponible.')
  }

  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .insert({
      task_id: task.id,
      requester_id: task.requester_id,
      helper_id: helperId,
    })
    .select()
    .single()

  if (chatError) {
    await supabase
      .from('tasks')
      .update({ helper_id: null, status: 'open' })
      .eq('id', taskId)
      .eq('helper_id', helperId)

    throw chatError
  }

  return { task, chat }
}

// Marca una tarea como completada. Solo el requester deberia poder hacerlo desde la UI.
export async function markTaskCompleted(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .in('status', ['assigned', 'in_progress'])
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se ha podido cerrar la tarea.')
  }

  return data
}

// Inserta la valoracion. El trigger de Supabase recalcula promedio y completed_tasks del helper.
export async function rateCompletedTask({ taskId, ratedId, score, comment }) {
  assertSupabaseReady()

  const safeScore = Number(score)
  if (!Number.isInteger(safeScore) || safeScore < 1 || safeScore > 5) {
    throw new Error('La valoracion debe estar entre 1 y 5.')
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion para valorar.')
  }

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      task_id: taskId,
      rater_id: userData.user.id,
      rated_id: ratedId,
      score: safeScore,
      comment: comment ? sanitizeText(comment, 600) : null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya has valorado esta tarea.')
    }
    throw error
  }

  return data
}

// Cancela una tarea propia que todavia no se haya completado.
export async function cancelTask(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .in('status', ['open', 'assigned', 'in_progress'])
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
