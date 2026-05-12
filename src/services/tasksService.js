import { supabase } from '../lib/supabaseClient'
import { assertSupabaseReady, sanitizeText } from '../lib/security'

const allowedCategories = ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
const allowedUrgencies = ['Ahora', 'Hoy', 'Flexible']

export function validateTaskInput(input) {
  const title = sanitizeText(input.title, 90)
  const description = sanitizeText(input.description, 600)
  const category = sanitizeText(input.category, 40)
  const urgency = sanitizeText(input.urgency, 20)
  const priceCents = Number(input.priceCents)
  const latitude = Number(input.latitude)
  const longitude = Number(input.longitude)

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
    },
  }
}

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
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
