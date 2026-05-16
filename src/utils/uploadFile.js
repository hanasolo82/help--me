import { supabase } from '../lib/supabaseClient'
import { requireUser } from '../lib/authHelpers'
import { convertImageToWebp, isImageFile } from '../lib/imageProcessing'

const MAX_INPUT_BYTES = 20 * 1024 * 1024

// Tamaños finales por uso. Avatar y mapa son cuadrados pequeños; task-image es apaisado.
const SCOPE_PRESETS = {
  avatar: { maxDimension: 512, quality: 0.88 },
  'map-avatar': { maxDimension: 256, quality: 0.85 },
  'task-image': { maxDimension: 1600, quality: 0.82 },
}

const DEFAULT_PRESET = { maxDimension: 1600, quality: 0.85 }

export function validateImageFile(file) {
  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (!isImageFile(file)) {
    throw new Error('El archivo debe ser una imagen.')
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen no puede pasar de 20 MB antes de procesarla.')
  }

  return file
}

export async function uploadFileToBucket(bucket, file, { scope = '' } = {}) {
  validateImageFile(file)

  const user = await requireUser('Necesitas iniciar sesion para subir imagenes.')

  const preset = SCOPE_PRESETS[scope] || DEFAULT_PRESET
  const webpFile = await convertImageToWebp(file, preset)

  const fileName = `${Date.now()}-${crypto.randomUUID()}.webp`
  const path = scope ? `${user.id}/${scope}/${fileName}` : `${user.id}/${fileName}`

  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, webpFile, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/webp',
  })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    path,
    publicUrl: data.publicUrl,
  }
}
