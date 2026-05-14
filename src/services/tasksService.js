import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

// Nota: categorias permitidas por el frontend para crear y filtrar tareas.
// Si anades una categoria, actualiza tambien el CHECK de public.tasks.category en Supabase.
export const allowedCategories = ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']

// Nota Supabase - public.tasks:
// Estas son las columnas que este servicio pide cada vez que lee una tarea.
// Si amplias public.tasks con mas datos (image_url, urgency, neighborhood, etc.),
// anade aqui las columnas que quieras recibir en las consultas.
// Si la columna tambien se guarda al crear una tarea, ampliala en validateTaskInput y createTask.
// No se anidan profiles porque este servicio asume que no hay FK directa declarada hacia profiles.
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

// Nota funcion:
// Limpia y valida los datos del formulario antes de usarlos en una insercion.
// Devuelve errores legibles y una version saneada de los valores.
// Esto protege el frontend, pero no sustituye las RLS ni los constraints SQL de Supabase.
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

// Nota funcion:
// Crea una tarea en public.tasks usando el usuario autenticado como created_by.
// Tambien fuerza status='open' para que una tarea nueva entre como disponible.
// Nota Supabase - public.tasks:
// Si anades columnas obligatorias sin default, incluyelas en validateTaskInput y en este insert.
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

// Nota funcion:
// Lista tareas abiertas para la vista de helper.
// Excluye las tareas creadas por el usuario actual y permite filtrar por categoria.
// Nota Supabase - public.tasks:
// Si quieres mostrar mas campos en las tarjetas/listados, anadelos primero a TASK_SELECT.
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

// Nota funcion:
// Devuelve tareas relacionadas con el usuario autenticado.
// role='requester' busca tareas creadas por el usuario; role='helper' busca tareas aceptadas.
// Nota Supabase - public.tasks:
// Si cambias created_by/accepted_by por otros nombres en la tabla, actualiza el mapeo column.
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

// Nota funcion:
// Lee una tarea concreta por id.
// maybeSingle permite devolver null si no existe o si las RLS impiden verla.
// Nota Supabase - public.tasks:
// Cualquier dato adicional que necesite la pantalla de detalle debe estar incluido en TASK_SELECT.
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

// Nota funcion:
// Acepta una tarea abierta, asigna accepted_by y cambia el estado a assigned.
// Despues crea el chat entre creador y helper.
// Si la insercion del chat falla, revierte accepted_by para que la tarea vuelva a quedar disponible.
// Nota Supabase - public.tasks/public.chats:
// Al ampliar public.tasks, revisa TASK_SELECT. Al ampliar public.chats con columnas obligatorias
// (por ejemplo last_message_at, status o metadata), anadelas en el insert del chat y en chatService.
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

// Nota funcion:
// Marca una tarea como completada cuando esta assigned o in_progress.
// La UI deberia ofrecer esta accion solo al creador; Supabase/RLS debe reforzar esa regla.
// Nota Supabase - public.tasks:
// Si anades completed_at, completed_by o datos de cierre, actualiza este update.
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

// Nota funcion:
// Cancela una tarea que todavia no esta completada.
// Devuelve la tarea actualizada o null si las condiciones/RLS no permiten el cambio.
// Nota Supabase - public.tasks:
// Si anades cancel_reason, cancelled_at o cancelled_by, actualiza este update y valida esos datos.
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
