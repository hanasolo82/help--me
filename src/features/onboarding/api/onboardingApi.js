import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'
import { createProfile, updateCurrentProfile } from '../../../services/profilesService'
import { replaceProfileSkills as replaceHelperProfileSkills } from '../../helper-onboarding/services/helperSkillsService'
import { replaceProfileAvailability as replaceHelperProfileAvailability } from '../../helper-onboarding/services/helperAvailabilityService'

export async function saveOnboardingBasics(input, profile) {
  if (profile) {
    const updates = {
      displayName: input.displayName ?? input.fullName,
      fullName: input.fullName ?? input.displayName,
      bio: input.bio,
      city: input.city,
      neighborhood: input.neighborhood,
      country: input.country,
      lat: input.lat,
      lng: input.lng,
      responseTimeMinutes: input.responseTimeMinutes,
      hourlyRate: input.hourlyRate,
      allowExactLocationUpdate: true,
    }

    if (input.username) {
      updates.username = input.username
    }

    return updateCurrentProfile(updates)
  }

  return createProfile(input)
}

export async function replaceProfileSkills(profileId, skills = []) {
  return replaceHelperProfileSkills(profileId, skills)
}

export async function replaceProfileAvailability(profileId, selectedDays = []) {
  return replaceHelperProfileAvailability(profileId, selectedDays)
}

export async function saveProfileVerification(profileId, values) {
  const user = await requireUser('Necesitas una sesion valida para guardar la verificacion.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  const ownedProfileId = user.id

  const profileUpdates = {
    verified_email: Boolean(values.verified_email),
    verified_phone: Boolean(values.verified_phone),
    verified_identity: Boolean(values.verified_identity),
    identity_verified: Boolean(values.identity_verified),
    ...(Object.prototype.hasOwnProperty.call(values, 'helper_status')
      ? { helper_status: values.helper_status }
      : {}),
    updated_at: new Date().toISOString(),
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', ownedProfileId)

  if (profileError) {
    throw profileError
  }

  const { error } = await supabase
    .from('profile_verifications')
    .upsert({
      profile_id: ownedProfileId,
      email_verified: Boolean(values.email_verified),
      phone_verified: Boolean(values.phone_verified),
      payment_verified: Boolean(values.payment_verified),
      identity_verified: Boolean(values.identity_verified),
      background_checked: Boolean(values.background_checked),
      updated_at: new Date().toISOString(),
    })

  if (error) {
    throw error
  }

  return profileUpdates
}

export async function getProfileVerificationState(profileId) {
  const user = await requireUser('Necesitas una sesion valida para leer la verificacion.')

  if (profileId && profileId !== user.id) {
    throw new Error('Unauthorized profile access')
  }

  const ownedProfileId = user.id

  const { data, error } = await supabase
    .from('profile_verifications')
    .select('profile_id, email_verified, phone_verified, payment_verified, identity_verified, background_checked, phone_status, updated_at')
    .eq('profile_id', ownedProfileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
