import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

// Valores permitidos por frontend. Si anades una categoria, anade tambien el CHECK en SQL si existe.
export const allowedCategories = ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']

// Columnas reales de public.tasks. No hay FK declarada hacia profiles, asi que no anidamos perfiles.
const TASK_SELECT = `
  id,
  created_by,
  accepted_by,
  title,
  description,
  category,
  price,
  status,
  lat,
  lng,
  created_at
`

// Valida y limpia los datos antes de enviarlos a Supabase. Esto no sustituye RLS ni constraints SQL.
export function validateTaskInput(input) {
  const title = sanitizeText(input.title, 90)
  const description = sanitizeText(input.description, 600)
  const category = sanitizeText(input.category, 40)
  const price = Number(input.price)
  const lat = Number(input.lat)
  const lng = Number(input.lng)

  const errors = []

  if (title.length < 3) errors.push('El titulo debe tener al menos 3 caracteres.')
  if (description.length < 3) errors.push('La descripcion debe tener al menos 3 caracteres.')
  if (!allowedCategories.includes(category)) errors.push('Categoria no permitida.')
  if (!Number.isFinite(price) || price < 0 || price > 500) errors.push('Precio no valido.')
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.push('Latitud no valida.')
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) errors.push('Longitud no valida.')

  return {
    isValid: errors.length === 0,
    errors,
    value: { title, description, category, price, lat, lng },
  }
}

// Crea una tarea real en Supabase usando el usuario autenticado como created_by.
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
      created_by: userData.user.id,
      status: 'open',
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
    query = query.neq('created_by', userId)
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

// Tareas del usuario autenticado, sea como creator o como helper.
export async function getMyTasks({ role = 'requester' } = {}) {
  assertSupabaseReady()

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion.')
  }

  const column = role === 'helper' ? 'accepted_by' : 'created_by'

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

// Lee una tarea por id.
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

// Acepta una tarea abierta: asigna accepted_by y crea el chat correspondiente.
// Si la insercion del chat falla, revierte accepted_by para que la tarea quede disponible.
export async function acceptTask(taskId) {
  assertSupabaseReady()

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    throw new Error('Necesitas iniciar sesion para aceptar una tarea.')
  }

  const helperId = userData.user.id

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .update({ accepted_by: helperId, status: 'assigned' })
    .eq('id', taskId)
    .eq('status', 'open')
    .is('accepted_by', null)
    .neq('created_by', helperId)
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
      user1_id: task.created_by,
      user2_id: helperId,
    })
    .select()
    .single()

  if (chatError) {
    await supabase
      .from('tasks')
      .update({ accepted_by: null, status: 'open' })
      .eq('id', taskId)
      .eq('accepted_by', helperId)

    throw chatError
  }

  return { task, chat }
}

// Marca una tarea como completada. Solo el creador deberia poder hacerlo desde la UI.
export async function markTaskCompleted(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'completed' })
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

// Cancela una tarea propia que todavia no se haya completado.
export async function cancelTask(taskId) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'cancelled' })
    .eq('id', taskId)
    .in('status', ['open', 'assigned', 'in_progress'])
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
