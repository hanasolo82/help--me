import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'

const DEFAULT_PREFIX = '+34'

async function resolveOwnedProfileId(profileId = null) {
  const user = await requireUser('Necesitas una sesion valida para gestionar tu telefono.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  return user.id
}

function normalizePhoneDigits(value = '') {
  return String(value ?? '').replace(/[^\d+]/g, '')
}

function countPhoneDigits(value = '') {
  return (String(value ?? '').match(/\d/g) ?? []).length
}

export function splitPhoneContactNumber(phoneNumber = '', defaultPrefix = DEFAULT_PREFIX) {
  const rawValue = String(phoneNumber ?? '').trim()

  if (!rawValue) {
    return {
      prefix: defaultPrefix,
      phoneNumber: '',
    }
  }

  const normalized = normalizePhoneDigits(rawValue)
  const fallbackDigits = String(defaultPrefix ?? DEFAULT_PREFIX).replace(/[^\d]/g, '')

  if (normalized.startsWith(`+${fallbackDigits}`)) {
    return {
      prefix: `+${fallbackDigits}`,
      phoneNumber: normalized.slice(fallbackDigits.length + 1).replace(/[^\d]/g, ''),
    }
  }

  return {
    prefix: defaultPrefix,
    phoneNumber: normalized.replace(/[^\d]/g, ''),
  }
}

function buildNormalizedPhoneNumber(phoneNumber) {
  const rawValue = String(phoneNumber ?? '').trim()

  if (!rawValue) {
    throw new Error('Introduce un teléfono válido o usa Añadir más tarde.')
  }

  const normalized = rawValue.replace(/[()\s-]/g, '')
  const digitCount = countPhoneDigits(normalized)

  if (digitCount < 7) {
    throw new Error('El número parece demasiado corto.')
  }

  if (digitCount > 15) {
    throw new Error('El número parece demasiado largo.')
  }

  const digitsOnly = normalized.replace(/[^\d]/g, '')
  return `+${digitsOnly}`
}

export async function getPhoneContact(profileId) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const [{ data: profileData, error: profileError }, { data: verificationData, error: verificationError }] =
    await Promise.all([
      supabase.from('profiles').select('phone_number').eq('id', ownedProfileId).maybeSingle(),
      supabase.from('profile_verifications').select('phone_status').eq('profile_id', ownedProfileId).maybeSingle(),
    ])

  if (profileError) {
    throw profileError
  }

  if (verificationError) {
    throw verificationError
  }

  const phoneNumber = profileData?.phone_number || ''
  const phoneStatus = verificationData?.phone_status || (phoneNumber ? 'provided' : 'not_provided')

  return {
    phoneNumber,
    phoneStatus,
  }
}

export async function savePhoneContact(profileId, phoneNumber) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const normalizedPhoneNumber = buildNormalizedPhoneNumber(phoneNumber)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      phone_number: normalizedPhoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ownedProfileId)

  if (profileError) {
    throw profileError
  }

  const { error: verificationError } = await supabase.from('profile_verifications').upsert({
    profile_id: ownedProfileId,
    phone_status: 'provided',
    updated_at: new Date().toISOString(),
  })

  if (verificationError) {
    throw verificationError
  }

  return {
    phoneNumber: normalizedPhoneNumber,
    phoneStatus: 'provided',
  }
}

export async function skipPhoneContact(profileId) {
  const ownedProfileId = await resolveOwnedProfileId(profileId)

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      phone_number: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', ownedProfileId)

  if (profileError) {
    throw profileError
  }

  const { error: verificationError } = await supabase.from('profile_verifications').upsert({
    profile_id: ownedProfileId,
    phone_status: 'not_provided',
    updated_at: new Date().toISOString(),
  })

  if (verificationError) {
    throw verificationError
  }

  return {
    phoneNumber: '',
    phoneStatus: 'not_provided',
  }
}
