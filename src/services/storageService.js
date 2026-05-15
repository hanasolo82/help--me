import { supabase } from '../lib/supabaseClient'
import { requireUser } from '../lib/authHelpers'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Valida un archivo de imagen antes de subirlo: tipo y peso. Devuelve el archivo o lanza.
export function validateImageFile(file) {
  if (!file) {
    throw new Error('Selecciona una imagen.')
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Formato no permitido. Usa JPG, PNG o WEBP.')
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('La imagen no puede pasar de 2 MB.')
  }

  return file
}

// Sube una imagen al bucket dado bajo {userId}/{timestamp-aleatorio}.{ext} y devuelve la URL publica.
// La RLS del bucket exige que el primer segmento de la ruta sea el id del usuario autenticado.
export async function uploadImage(bucket, file) {
  validateImageFile(file)

  const user = await requireUser('Necesitas iniciar sesion para subir imagenes.')

  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg'
  const safeExtension = /^[a-z0-9]{1,5}$/.test(extension) ? extension : 'jpg'
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    path,
    publicUrl: publicData.publicUrl,
  }
}

export function uploadTaskImage(file) {
  return uploadImage('task-images', file)
}

export function uploadAvatar(file) {
  return uploadImage('avatars', file)
}
