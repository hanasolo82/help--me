import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180
  const earthRadiusKm = 6371
  const deltaLat = toRadians(lat2 - lat1)
  const deltaLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function getProfileById(profileId) {
  if (!profileId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getSkillsCatalog() {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, icon, category')
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getProfileSkills(profileId) {
  if (!profileId) return []

  const { data, error } = await supabase
    .from('profile_skills')
    .select('profile_id, experience_level, years_experience, skill:skills(id, name, icon, category)')
    .eq('profile_id', profileId)
    .order('years_experience', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    ...row,
    skill: Array.isArray(row.skill) ? row.skill[0] : row.skill,
  }))
}

export async function getProfileReviews(profileId) {
  if (!profileId) return []

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      id,
      task_id,
      reviewer_id,
      reviewed_user_id,
      rating,
      communication_rating,
      punctuality_rating,
      trust_rating,
      comment,
      created_at,
      reviewer:profiles!reviews_reviewer_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        rating,
        verified
      ),
      task:tasks!reviews_task_id_fkey (
        id,
        title,
        category,
        created_by,
        accepted_by
      )
    `)
    .eq('reviewed_user_id', profileId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => ({
    ...row,
    reviewer: Array.isArray(row.reviewer) ? row.reviewer[0] : row.reviewer,
    task: Array.isArray(row.task) ? row.task[0] : row.task,
  }))
}

export async function getProfileVerifications(profileId) {
  if (!profileId) return null

  const { data, error } = await supabase
    .from('profile_verifications')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function getProfileAvailability(profileId) {
  if (!profileId) return []

  const { data, error } = await supabase
    .from('profile_availability')
    .select('profile_id, day_of_week, start_time, end_time')
    .eq('profile_id', profileId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getNearbyHelpers({
  lat,
  lng,
  radiusKm = 10,
  limit = 12,
  excludeProfileId = null,
  category = null,
}) {
  const centerLat = toNumber(lat)
  const centerLng = toNumber(lng)

  if (centerLat === null || centerLng === null) {
    return []
  }

  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180) || 1)

  let query = supabase
    .from('profiles')
    .select('id, username, full_name, display_name, avatar_url, map_avatar_url, bio, rating, completed_tasks, reviews_count, verified, verified_email, verified_phone, verified_identity, identity_verified, helper_enabled, availability_enabled, hourly_rate, response_time_minutes, lat, lng, city, country, neighborhood, account_status')
    .eq('helper_enabled', true)
    .eq('account_status', 'active')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', centerLat - latDelta)
    .lte('lat', centerLat + latDelta)
    .gte('lng', centerLng - lngDelta)
    .lte('lng', centerLng + lngDelta)
    .order('rating', { ascending: false })
    .limit(Math.max(limit * 2, limit))

  if (excludeProfileId) {
    query = query.neq('id', excludeProfileId)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  let helpers = (data ?? [])
    .map((helper) => {
      const helperLat = toNumber(helper.lat)
      const helperLng = toNumber(helper.lng)

      if (helperLat === null || helperLng === null) return null

      return {
        ...helper,
        distance_km: haversineDistanceKm(centerLat, centerLng, helperLat, helperLng),
      }
    })
    .filter(Boolean)
    .filter((helper) => helper.distance_km <= radiusKm)
    .sort((a, b) => a.distance_km - b.distance_km)
    .slice(0, limit)

  if (category) {
    helpers = helpers.filter((helper) =>
      (helper.skills ?? []).some((skill) => skill?.category === category || skill?.name === category),
    )
  }

  if (helpers.length === 0) {
    return []
  }

  const helperIds = helpers.map((helper) => helper.id)

  const { data: skillRows, error: skillError } = await supabase
    .from('profile_skills')
    .select('profile_id, experience_level, years_experience, skill:skills(id, name, icon, category)')
    .in('profile_id', helperIds)
    .order('years_experience', { ascending: false })

  if (skillError) {
    throw skillError
  }

  const skillRowsByProfileId = new Map()

  for (const row of skillRows ?? []) {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill
    const current = skillRowsByProfileId.get(row.profile_id) ?? []
    current.push({
      experience_level: row.experience_level,
      years_experience: row.years_experience,
      skill,
    })
    skillRowsByProfileId.set(row.profile_id, current)
  }

  return helpers.map((helper) => ({
    ...helper,
    skills: (skillRowsByProfileId.get(helper.id) ?? []).map((entry) => entry.skill).filter(Boolean).slice(0, 3),
  }))
}

export async function getFavoriteProfileIds(viewerId) {
  if (!viewerId) return []

  const { data, error } = await supabase
    .from('profile_favorites')
    .select('favorited_profile_id')
    .eq('viewer_id', viewerId)

  if (error) {
    throw error
  }

  return (data ?? []).map((row) => row.favorited_profile_id)
}

export async function toggleFavoriteProfile(profileId) {
  const user = await requireUser('Necesitas una sesion valida para guardar favoritos.')
  const viewerId = user.id

  const { data: existing, error: existingError } = await supabase
    .from('profile_favorites')
    .select('viewer_id, favorited_profile_id')
    .eq('viewer_id', viewerId)
    .eq('favorited_profile_id', profileId)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing) {
    const { error } = await supabase
      .from('profile_favorites')
      .delete()
      .eq('viewer_id', viewerId)
      .eq('favorited_profile_id', profileId)

    if (error) {
      throw error
    }

    return { isFavorite: false }
  }

  const { error } = await supabase
    .from('profile_favorites')
    .insert({
      viewer_id: viewerId,
      favorited_profile_id: profileId,
    })

  if (error) {
    throw error
  }

  return { isFavorite: true }
}
