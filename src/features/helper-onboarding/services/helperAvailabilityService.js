import { supabase } from '../../../lib/supabaseClient'

function normalizeSelectedDays(selectedDays = []) {
  const uniqueDays = []

  for (const value of selectedDays) {
    const dayValue = typeof value === 'object' && value !== null ? value.day_of_week ?? value.day ?? value.value : value
    const day = Number(dayValue)
    if (!Number.isInteger(day) || day < 0 || day > 6) continue
    if (!uniqueDays.includes(day)) uniqueDays.push(day)
  }

  return uniqueDays.sort((a, b) => a - b)
}

export async function getProfileAvailability(profileId) {
  if (!profileId) return []

  const { data, error } = await supabase
    .from('profile_availability')
    .select('day_of_week')
    .eq('profile_id', profileId)

  if (error) {
    throw error
  }

  const visualOrder = [1, 2, 3, 4, 5, 6, 0]

  return (data ?? [])
    .map((row) => Number(row.day_of_week))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => visualOrder.indexOf(a) - visualOrder.indexOf(b))
}

export async function replaceProfileAvailability(profileId, selectedDays = []) {
  if (!profileId) {
    throw new Error('No pudimos guardar la disponibilidad porque falta el profile.')
  }

  const normalizedDays = normalizeSelectedDays(selectedDays)
  const availabilityEnabled = normalizedDays.length > 0

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

  if (!normalizedDays.length) {
    return []
  }

  const rows = normalizedDays.map((day_of_week) => ({
    profile_id: profileId,
    day_of_week,
    start_time: '00:00',
    end_time: '23:59',
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from('profile_availability')
    .insert(rows)
    .select('profile_id, day_of_week, start_time, end_time')

  if (error) {
    throw error
  }

  return data ?? []
}
