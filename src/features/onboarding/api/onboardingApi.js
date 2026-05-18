import { supabase } from '../../../lib/supabaseClient'
import { createProfile, updateCurrentProfile } from '../../../services/profilesService'

export async function saveOnboardingBasics(input, profile) {
  if (profile) {
    return updateCurrentProfile(input)
  }

  return createProfile(input)
}

export async function replaceProfileSkills(profileId, skills = []) {
  if (!profileId) {
    throw new Error('No pudimos guardar las skills porque falta el profile.')
  }

  const { error: deleteError } = await supabase
    .from('profile_skills')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) {
    throw deleteError
  }

  if (!skills.length) {
    return []
  }

  const { data, error } = await supabase
    .from('profile_skills')
    .insert(
      skills.map((skill) => ({
        profile_id: profileId,
        skill_id: skill.skill_id,
        experience_level: skill.experience_level || 'beginner',
        years_experience: Number(skill.years_experience) || 0,
      })),
    )
    .select('profile_id, experience_level, years_experience, skill:skills(id, name, icon, category)')

  if (error) {
    throw error
  }

  return data ?? []
}

export async function replaceProfileAvailability(profileId, slots = [], availabilityEnabled = true) {
  if (!profileId) {
    throw new Error('No pudimos guardar la disponibilidad porque falta el profile.')
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ availability_enabled: availabilityEnabled, updated_at: new Date().toISOString() })
    .eq('id', profileId)

  if (profileError) {
    throw profileError
  }

  const { error: deleteError } = await supabase
    .from('profile_availability')
    .delete()
    .eq('profile_id', profileId)

  if (deleteError) {
    throw deleteError
  }

  if (!slots.length) {
    return []
  }

  const { data, error } = await supabase
    .from('profile_availability')
    .insert(
      slots.map((slot) => ({
        profile_id: profileId,
        day_of_week: slot.day_of_week,
        start_time: slot.start_time,
        end_time: slot.end_time,
      })),
    )
    .select('profile_id, day_of_week, start_time, end_time')

  if (error) {
    throw error
  }

  return data ?? []
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

