import { supabase } from '../../../lib/supabaseClient'
import { createProfile, updateCurrentProfile } from '../../../services/profilesService'
import { replaceProfileSkills as replaceHelperProfileSkills } from '../../helper-onboarding/services/helperSkillsService'
import { replaceProfileAvailability as replaceHelperProfileAvailability } from '../../helper-onboarding/services/helperAvailabilityService'

export async function saveOnboardingBasics(input, profile) {
  if (profile) {
    return updateCurrentProfile(input)
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
  if (!profileId) {
    throw new Error('No pudimos guardar la verificacion porque falta el profile.')
  }

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
    .eq('id', profileId)

  if (profileError) {
    throw profileError
  }

  const { error } = await supabase
    .from('profile_verifications')
    .upsert({
      profile_id: profileId,
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
  if (!profileId) {
    return null
  }

  const { data, error } = await supabase
    .from('profile_verifications')
    .select('profile_id, email_verified, phone_verified, payment_verified, identity_verified, background_checked, phone_status, updated_at')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
