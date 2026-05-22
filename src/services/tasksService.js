import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'
import { requireUser } from '../lib/authHelpers'
import { getCurrentUser } from './authService'
import { createOrGetDirectConversation } from '../features/chat/api/chatApi'

// Nota: categorias permitidas por el frontend para crear y filtrar tareas.
// Si anades una categoria, actualiza tambien el CHECK de public.tasks.category en Supabase.
export const allowedCategories = ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']

// Nota Supabase - public.tasks:
// Estas son las columnas que este servicio pide cada vez que lee una tarea.
// Si amplias public.tasks con mas datos (image_url, urgency, neighborhood, etc.),
// anade aqui las columnas que quieras recibir en las consultas.
// Si la columna tambien se guarda al crear una tarea, ampliala en validateTaskInput y createTask.
// El profile del creador y del ayudante se carga despues con attachTaskProfiles porque aqui no anidamos FKs.
// published_at y cancelled_at se usan para mostrar el tiempo real de publicacion/cancelacion.
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
  published_at,
  cancelled_at,
  modified_at,
  created_at
`

const AVAILABLE_PROFILE_STATUS = 'active'
const CREATOR_PROFILE_SELECT = 'id, username, display_name, full_name, avatar_url, rating, verified, account_status'

function isProfileAvailable(profile) {
  return profile?.account_status === AVAILABLE_PROFILE_STATUS
}

async function attachTaskProfiles(tasks) {
  if (!tasks?.length) {
    return tasks || []
  }

  const profileIds = [...new Set(tasks.flatMap((task) => [task.created_by, task.accepted_by]).filter(Boolean))]

  if (profileIds.length === 0) {
    return tasks
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select(CREATOR_PROFILE_SELECT)
    .in('id', profileIds)

  if (error) {
    throw error
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, profile]))

  return tasks.map((task) => ({
    ...task,
    creator_profile: profilesById.get(task.created_by) || null,
    accepted_profile: profilesById.get(task.accepted_by) || null,
  }))
}

function keepTasksWithAvailableCreators(tasks) {
  return tasks.filter((task) => isProfileAvailable(task.creator_profile))
}

export function canEditTask(task) {
  return Boolean(task && !task.accepted_by && ['draft', 'open'].includes(task.status))
}

function getTaskTimelineDate(task) {
  return task?.published_at || task?.created_at || null
}

function sortRequesterTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const leftDate = new Date(getTaskTimelineDate(left) || 0).getTime()
    const rightDate = new Date(getTaskTimelineDate(right) || 0).getTime()

    if (leftDate !== rightDate) {
      return rightDate - leftDate
    }

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  })
}

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
// Tambien fuerza status='draft' para que la tarea se guarde sin publicar hasta que el usuario lo decida.
// Nota Supabase - public.tasks:
// Si anades columnas obligatorias sin default, incluyelas en validateTaskInput y en este insert.
export async function createTask(input) {
  const validation = validateTaskInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const user = await requireUser('Necesitas iniciar sesion para publicar una tarea.')

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...validation.value,
      created_by: user.id,
      status: 'draft',
      published_at: null,
      modified_at: null,
    })
    .select(TASK_SELECT)
    .single()

  if (error) {
    throw error
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  return tasksWithProfiles[0]
}

// Nota funcion:
// Actualiza una tarea propia sin cambiar su id ni su created_at.
// Solo permite editar borradores o tareas publicadas que aun no hayan sido aceptadas.
// Nota Supabase - public.tasks:
// Si anades mas campos editables, incluyelos en validateTaskInput y en este update.
export async function updateTask(taskId, input) {
  const validation = validateTaskInput(input)

  if (!validation.isValid) {
    throw new Error(validation.errors[0])
  }

  const user = await requireUser('Necesitas iniciar sesion para editar una tarea.')

  const candidateTask = await getTaskById(taskId, { viewer: user })

  if (!candidateTask || candidateTask.created_by !== user.id || !canEditTask(candidateTask)) {
    throw new Error('La tarea no se puede editar.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      ...validation.value,
      modified_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('created_by', user.id)
    .in('status', ['draft', 'open'])
    .is('accepted_by', null)
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('La tarea no se pudo actualizar.')
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  return tasksWithProfiles[0]
}

// Nota funcion:
// Publica una tarea propia que aun estaba en borrador.
// Cambia el estado a open y fija published_at para que el contador de "abierta/publicada"
// empiece en ese momento, no en el instante de creacion.
// Nota Supabase - public.tasks:
// Si a futuro anades published_at obligatorio, manten este update en sincronía con el schema.
export async function publishTask(taskId) {
  const user = await requireUser('Necesitas iniciar sesion para publicar una tarea.')

  const candidateTask = await getTaskById(taskId, { viewer: user })

  if (!candidateTask || candidateTask.created_by !== user.id || candidateTask.status !== 'draft') {
    throw new Error('La tarea no se puede publicar.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'open',
      published_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('created_by', user.id)
    .eq('status', 'draft')
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('La tarea no se pudo publicar.')
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  return tasksWithProfiles[0]
}

// Nota funcion:
// Lista tareas abiertas para la vista de helper.
// Excluye las tareas creadas por el usuario actual y permite filtrar por categoria.
// Nota Supabase - public.tasks:
// Si quieres mostrar mas campos en las tarjetas/listados, anadelos primero a TASK_SELECT.
export async function getOpenTasks({ category } = {}) {
  assertSupabaseReady()

  const user = await getCurrentUser()
  const userId = user?.id

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

  const tasksWithProfiles = await attachTaskProfiles(data)
  return keepTasksWithAvailableCreators(tasksWithProfiles)
}

// Nota funcion:
// Devuelve tareas relacionadas con el usuario autenticado.
// role='requester' busca tareas creadas por el usuario; role='helper' busca tareas aceptadas.
// Nota Supabase - public.tasks:
// Si cambias created_by/accepted_by por otros nombres en la tabla, actualiza el mapeo column.
export async function getMyTasks(profileId = null, { role = 'requester' } = {}) {
  const user = await requireUser()
  const ownerId = profileId || user.id

  if (ownerId !== user.id) {
    throw new Error('No puedes leer solicitudes ajenas.')
  }

  const column = role === 'helper' ? 'accepted_by' : 'created_by'

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq(column, ownerId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const tasksWithProfiles = await attachTaskProfiles(data)

  return role === 'requester' ? sortRequesterTasks(tasksWithProfiles) : tasksWithProfiles
}

// Nota funcion:
// Lee una tarea concreta por id.
// maybeSingle permite devolver null si no existe o si las RLS impiden verla.
// Nota Supabase - public.tasks:
// Cualquier dato adicional que necesite la pantalla de detalle debe estar incluido en TASK_SELECT.
export async function getTaskById(taskId, { viewer } = {}) {
  assertSupabaseReady()

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return data
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  const taskWithProfile = tasksWithProfiles[0]
  // Si el caller ya tiene el user (interno: acceptTask/updateTask/publishTask),
  // reutilizamos su valor para no hacer un round trip extra a auth.getUser().
  const resolvedViewer = viewer !== undefined ? viewer : await getCurrentUser()
  const userId = resolvedViewer?.id
  const canSeeUnavailableCreator =
    userId && (taskWithProfile.created_by === userId || taskWithProfile.accepted_by === userId)

  if (!isProfileAvailable(taskWithProfile.creator_profile) && !canSeeUnavailableCreator) {
    return null
  }

  if (taskWithProfile.status === 'draft' && taskWithProfile.created_by !== userId) {
    return null
  }

  return taskWithProfile
}

// Nota funcion:
// Acepta una tarea abierta, asigna accepted_by y cambia el estado a assigned.
// Despues crea el chat entre creador y helper.
// Si la insercion del chat falla, revierte accepted_by para que la tarea vuelva a quedar disponible.
// Nota Supabase - public.tasks/public.chats:
// Al ampliar public.tasks, revisa TASK_SELECT. Al ampliar public.chats con columnas obligatorias
// (por ejemplo last_message_at, status o metadata), anadelas en el insert del chat y en chatService.
export async function acceptTask(taskId) {
  const user = await requireUser('Necesitas iniciar sesion para aceptar una tarea.')
  const helperId = user.id
  const candidateTask = await getTaskById(taskId, { viewer: user })

  if (
    !candidateTask ||
    !isProfileAvailable(candidateTask.creator_profile) ||
    candidateTask.status !== 'open' ||
    candidateTask.accepted_by
  ) {
    throw new Error('La tarea ya no esta disponible.')
  }

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

  try {
    const conversationId = await createOrGetDirectConversation(task.created_by)
    return { task, conversation: { id: conversationId } }
  } catch (chatError) {
    await supabase
      .from('tasks')
      .update({ accepted_by: null, status: 'open' })
      .eq('id', taskId)
      .eq('accepted_by', helperId)

    throw chatError
  }
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
// Cancela una tarea propia marcandola como cancelled.
// Devuelve la tarea actualizada o null si las condiciones/RLS no permiten el cambio.
// Nota Supabase - public.tasks:
// Si anades cancel_reason o cancelled_by, actualiza este update y valida esos datos.
export async function cancelTask(taskId) {
  const user = await requireUser()

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('created_by', user.id)
    .in('status', ['draft', 'open', 'assigned', 'in_progress'])
    .select(TASK_SELECT)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
