import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'
import { requireUser } from '../lib/authHelpers'
import { getCurrentUser } from './authService'
import { canAcceptTask } from '../features/helper-onboarding/utils/helperPermissions'
import { getProfileByUserId } from './profilesService'

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
  location_label,
  published_at,
  cancelled_at,
  modified_at,
  completed_at,
  updated_at,
  created_at
`

const BLOCKED_PROFILE_STATUS = 'suspended'
const CREATOR_PROFILE_SELECT = 'id, username, full_name, avatar_url, rating, account_status'
const APPLICATION_SELECT = 'id, task_id, helper_id, message, status, created_at, updated_at'

function isProfileAvailable(profile) {
  return profile?.account_status !== BLOCKED_PROFILE_STATUS
}

function normalizePublicProfile(profile) {
  if (!profile) return null

  return {
    ...profile,
    display_name: profile.full_name,
    verified: false,
  }
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
    .from('public_profiles')
    .select(CREATOR_PROFILE_SELECT)
    .in('id', profileIds)

  if (error) {
    throw error
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, normalizePublicProfile(profile)]))

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

function sortHelperTasks(tasks) {
  return [...tasks].sort((left, right) => {
    const leftDistance = Number(left.distance_km)
    const rightDistance = Number(right.distance_km)
    const hasLeftDistance = Number.isFinite(leftDistance)
    const hasRightDistance = Number.isFinite(rightDistance)

    if (hasLeftDistance && hasRightDistance && leftDistance !== rightDistance) {
      return leftDistance - rightDistance
    }

    if (hasLeftDistance !== hasRightDistance) {
      return hasLeftDistance ? -1 : 1
    }

    const leftDate = new Date(left.published_at || left.created_at || 0).getTime()
    const rightDate = new Date(right.published_at || right.created_at || 0).getTime()

    if (leftDate !== rightDate) {
      return rightDate - leftDate
    }

    return String(left.id || '').localeCompare(String(right.id || ''))
  })
}

function hasMatchingCategory(task, category) {
  if (!category || category === 'Todas') {
    return true
  }

  return task.category === category
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
  const locationLabel = sanitizeText(input.location_label ?? input.locationLabel ?? '', 240)

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
    value: { title, description, category, price, lat, lng, location_label: locationLabel || null },
  }
}

async function attachApplicationProfiles(applications) {
  if (!applications?.length) {
    return applications || []
  }

  const helperIds = [...new Set(applications.map((application) => application.helper_id).filter(Boolean))]

  if (helperIds.length === 0) {
    return applications
  }

  const { data: profiles, error } = await supabase
    .from('public_profiles')
    .select(CREATOR_PROFILE_SELECT)
    .in('id', helperIds)

  if (error) {
    throw error
  }

  const profilesById = new Map((profiles || []).map((profile) => [profile.id, normalizePublicProfile(profile)]))

  return applications.map((application) => ({
    ...application,
    helper_profile: profilesById.get(application.helper_id) || null,
  }))
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
  return getAvailableTasksForHelper(user, { category })
}

// Nota funcion:
// Lista tareas abiertas para helpers activos.
// Excluye las tareas del propio usuario y deja preparado el ranking por proximidad y futuro matching.
// Nota Supabase - public.tasks:
// Si quieres mostrar mas campos en las tarjetas/listados, anadelos primero a TASK_SELECT.
export async function getAvailableTasksForHelper(profile, { category } = {}) {
  assertSupabaseReady()

  const helperId = profile?.id || null

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (helperId) {
    query = query.neq('created_by', helperId)
  }

  if (category && category !== 'Todas') {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const tasksWithProfiles = await attachTaskProfiles(data)
  const publicTasks = keepTasksWithAvailableCreators(tasksWithProfiles).filter((task) => hasMatchingCategory(task, category))

  return sortHelperTasks(publicTasks)
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
// Lee los ids de favoritos de tareas del helper autenticado.
// Solo sirve para el propio usuario y no expone tareas privadas.
export async function getFavoriteTaskIds(viewerId = null) {
  assertSupabaseReady()

  const user = viewerId ? { id: viewerId } : await requireUser('Necesitas una sesion valida para ver favoritos.')

  const { data, error } = await supabase
    .from('task_favorites')
    .select('task_id')
    .eq('viewer_id', user.id)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => row.task_id).filter(Boolean)
}

// Nota funcion:
// Alterna el estado de favorito de una tarea para el helper autenticado.
// Requiere que la tabla task_favorites exista con RLS por usuario.
export async function toggleTaskFavorite(taskId) {
  assertSupabaseReady()
  const user = await requireUser('Necesitas una sesion valida para guardar favoritos.')

  const { data: existing, error: existingError } = await supabase
    .from('task_favorites')
    .select('viewer_id, task_id')
    .eq('viewer_id', user.id)
    .eq('task_id', taskId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    const { error } = await supabase
      .from('task_favorites')
      .delete()
      .eq('viewer_id', user.id)
      .eq('task_id', taskId)

    if (error) {
      throw error
    }

    return { isFavorite: false }
  }

  const { error } = await supabase
    .from('task_favorites')
    .insert({
      viewer_id: user.id,
      task_id: taskId,
    })

  if (error) {
    throw error
  }

  return { isFavorite: true }
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
// Modelo profesional: el helper se ofrece, no asigna la tarea directamente.
// La seleccion del helper queda en manos del requester mediante selectTaskHelper.
export async function applyToTask(taskId, message = '') {
  const user = await requireUser('Necesitas iniciar sesion para aceptar una tarea.')
  const helperId = user.id
  const helperProfile = await getProfileByUserId(helperId)

  if (!canAcceptTask(helperProfile)) {
    throw new Error('Completa y activa tu perfil de helper antes de ofrecerte a tareas.')
  }

  const candidateTask = await getTaskById(taskId, { viewer: user })

  if (
    !candidateTask ||
    !isProfileAvailable(candidateTask.creator_profile) ||
    candidateTask.status !== 'open' ||
    candidateTask.accepted_by
  ) {
    throw new Error('La tarea ya no esta disponible.')
  }

  const { data, error } = await supabase.rpc('apply_to_task', {
    p_task_id: taskId,
    p_message: sanitizeText(message, 600) || null,
  })

  if (error) {
    throw error
  }

  return data
}

// Compatibilidad con imports antiguos: aceptar ahora significa ofrecerse.
export async function acceptTask(taskId) {
  const application = await applyToTask(taskId)
  return { application, conversation: null }
}

export async function getTaskApplications(taskId) {
  assertSupabaseReady()
  await requireUser('Necesitas iniciar sesion para ver los helpers interesados.')

  const { data, error } = await supabase
    .from('task_applications')
    .select(APPLICATION_SELECT)
    .eq('task_id', taskId)
    .in('status', ['pending', 'selected'])
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return attachApplicationProfiles(data || [])
}

export async function selectTaskHelper(applicationId) {
  await requireUser('Necesitas iniciar sesion para elegir helper.')

  const { data, error } = await supabase.rpc('select_task_helper', {
    p_application_id: applicationId,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo elegir este helper.')
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  return tasksWithProfiles[0]
}

export async function rejectTaskApplication(applicationId) {
  await requireUser('Necesitas iniciar sesion para rechazar una candidatura.')

  const { data, error } = await supabase.rpc('reject_task_application', {
    p_application_id: applicationId,
  })

  if (error) {
    throw error
  }

  return data
}

export async function withdrawTaskApplication(applicationId) {
  await requireUser('Necesitas iniciar sesion para retirar tu candidatura.')

  const { data, error } = await supabase.rpc('withdraw_task_application', {
    p_application_id: applicationId,
  })

  if (error) {
    throw error
  }

  return data
}

// Nota funcion:
// Marca una tarea como completada cuando ya esta en marcha o ya fue completada por el sistema.
// La UI deberia ofrecer esta accion solo al creador; Supabase/RLS debe reforzar esa regla.
// Nota Supabase - public.tasks:
// Si anades completed_at, completed_by o datos de cierre, actualiza este update.
export async function markTaskCompleted(taskId) {
  assertSupabaseReady()
  const user = await requireUser('Necesitas iniciar sesion para cerrar una tarea.')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('created_by', user.id)
    .in('status', ['in_progress', 'completed'])
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

// Rechaza el helper asignado antes del pago y devuelve la tarea a abierta.
// La limpieza segura de pago pendiente y conversacion task-scoped vive en el RPC.
export async function rejectAssignedHelper(taskId) {
  await requireUser('Necesitas iniciar sesion para rechazar este helper.')

  const { data, error } = await supabase.rpc('reject_assigned_helper', {
    p_task_id: taskId,
  })

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('No se pudo rechazar el helper.')
  }

  const tasksWithProfiles = await attachTaskProfiles([data])
  return tasksWithProfiles[0]
}
