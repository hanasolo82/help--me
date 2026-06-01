import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'

const CERTIFICATE_BUCKET = 'profile-certificates'
const ALLOWED_CERTIFICATE_EXTENSIONS = new Set(['PDF', 'DOC', 'DOCX', 'ODT'])
const ALLOWED_CERTIFICATE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
])

async function resolveOwnedProfileId(profileId = null) {
  const user = await requireUser('Necesitas una sesion valida para gestionar tus certificados.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  return user.id
}

function getFileExtension(fileName) {
  const nameParts = String(fileName || '').split('.')
  if (nameParts.length < 2) return 'FILE'

  return nameParts.pop().toUpperCase()
}

function getCertificateTitle(fileName) {
  const cleaned = String(fileName || 'Certificado').trim()
  if (!cleaned) return 'Certificado'

  const withoutExtension = cleaned.replace(/\.[^.]+$/, '').trim()
  return (withoutExtension || cleaned).slice(0, 140)
}

function sanitizeFileName(fileName) {
  const fallback = `certificate-${Date.now()}`
  const cleaned = String(fileName || fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

  return cleaned || fallback
}

function createStoragePath(profileId, file) {
  const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`

  return `${profileId}/${randomId}-${sanitizeFileName(file?.name)}`
}

function isAllowedCertificate(file) {
  const extension = getFileExtension(file?.name)
  if (file?.type?.startsWith('image/')) return false

  return (
    ALLOWED_CERTIFICATE_EXTENSIONS.has(extension) &&
    (!file?.type || file.type === 'application/octet-stream' || ALLOWED_CERTIFICATE_TYPES.has(file.type))
  )
}

export async function getProfileCertificates(profileId) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const { data, error } = await supabase
    .from('profile_certificates')
    .select('id, profile_id, title, file_path, file_name, mime_type, size_bytes, status, created_at')
    .eq('profile_id', ownedProfileId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function uploadProfileCertificate(profileId, file) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  if (!file || !isAllowedCertificate(file)) {
    throw new Error('Solo puedes subir documentos PDF, DOC, DOCX u ODT.')
  }

  const filePath = createStoragePath(ownedProfileId, file)
  const { error: uploadError } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const row = {
    profile_id: ownedProfileId,
    title: getCertificateTitle(file.name),
    file_path: filePath,
    file_name: file.name || 'certificate',
    mime_type: file.type || null,
    size_bytes: Number.isFinite(file.size) ? file.size : null,
    status: 'pending',
  }

  const { data, error } = await supabase
    .from('profile_certificates')
    .insert(row)
    .select('id, profile_id, title, file_path, file_name, mime_type, size_bytes, status, created_at')
    .single()

  if (error) {
    await supabase.storage.from(CERTIFICATE_BUCKET).remove([filePath])
    throw error
  }

  return data
}

export async function deleteProfileCertificate(profileId, certificateId) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const { data: certificate, error: fetchError } = await supabase
    .from('profile_certificates')
    .select('id, file_path')
    .eq('profile_id', ownedProfileId)
    .eq('id', certificateId)
    .maybeSingle()

  if (fetchError) {
    throw fetchError
  }

  if (!certificate) {
    throw new Error('No se ha encontrado el certificado.')
  }

  const { error: storageError } = await supabase.storage
    .from(CERTIFICATE_BUCKET)
    .remove([certificate.file_path])

  if (storageError) {
    throw storageError
  }

  const { error } = await supabase
    .from('profile_certificates')
    .delete()
    .eq('profile_id', ownedProfileId)
    .eq('id', certificateId)

  if (error) {
    throw error
  }

  return certificateId
}
