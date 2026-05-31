import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'

function toNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getProfileById(profileId) {
  if (!profileId) return null

  const { data, error } = await supabase
    .from('public_profiles')
    .select(`
      id,
      username,
      full_name,
      avatar_url,
      bio,
      neighborhood,
      city,
      country,
      rating,
      completed_tasks,
      reviews_count,
      helper_status,
      availability_enabled,
      account_status,
      location_label
    `)
    .eq('id', profileId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? { ...data, display_name: data.full_name } : data
}

export async function getSkillsCatalog() {
  const { data, error } = await supabase
    .from('skills')
    .select('id, name, icon, category, sort_order, is_active')
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
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

  const reviewerIds = [...new Set((data ?? []).map((row) => row.reviewer_id).filter(Boolean))]
  let reviewersById = new Map()

  if (reviewerIds.length > 0) {
    const { data: reviewers, error: reviewersError } = await supabase
      .from('public_profiles')
      .select('id, username, full_name, avatar_url, rating, account_status')
      .in('id', reviewerIds)

    if (reviewersError) {
      throw reviewersError
    }

    reviewersById = new Map(
      (reviewers ?? []).map((reviewer) => [
        reviewer.id,
        {
          ...reviewer,
          display_name: reviewer.full_name,
          verified: false,
        },
      ]),
    )
  }

  return (data ?? []).map((row) => ({
    ...row,
    reviewer: reviewersById.get(row.reviewer_id) || null,
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
    .select('profile_id, day_of_week, start_time, end_time, created_at, updated_at')
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
  radiusEnabled = true,
  bounds = null,
  limit = 12,
  excludeProfileId = null,
  category = null,
}) {
  const centerLat = toNumber(lat)
  const centerLng = toNumber(lng)
  const north = toNumber(bounds?.north)
  const south = toNumber(bounds?.south)
  const east = toNumber(bounds?.east)
  const west = toNumber(bounds?.west)
  const safeRadiusKm = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0 ? Number(radiusKm) : 10
  const shouldUseRadius = radiusEnabled !== false

  if (centerLat === null || centerLng === null) {
    return []
  }

  const { data, error } = await supabase.rpc('get_public_helpers_for_map', {
    p_center_lat: centerLat,
    p_center_lng: centerLng,
    p_radius_km: safeRadiusKm,
    p_radius_enabled: shouldUseRadius,
    p_north: north,
    p_south: south,
    p_east: east,
    p_west: west,
    p_limit: Math.max(limit * (shouldUseRadius ? 2 : 4), limit),
    p_exclude_profile_id: excludeProfileId,
  })

  if (error) {
    throw error
  }

  const publicHelpers = (data ?? []).map((helper) => ({
    ...helper,
    display_name: helper.full_name,
    username: helper.username || null,
    account_status: 'active',
  }))

  if (publicHelpers.length === 0) {
    return []
  }

  const helperIds = publicHelpers.map((helper) => helper.id)

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

  const helpers = publicHelpers
    .map((helper) => ({
      ...helper,
      skills: (skillRowsByProfileId.get(helper.id) ?? []).map((entry) => entry.skill).filter(Boolean).slice(0, 3),
    }))
    .filter((helper) =>
      !category ||
      (helper.skills ?? []).some((skill) => skill?.category === category || skill?.name === category),
    )
    .slice(0, limit)

  return helpers.map((helper) => ({
    ...helper,
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
