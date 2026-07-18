import { supabase } from '../../../lib/supabaseClient'
import { requireUser } from '../../../lib/authHelpers'
import {
  MAX_PROFILE_SKILLS,
  normalizeSkillNameForComparison,
} from '../../skills/config/skillCategories'

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
      accepts_direct_requests,
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

  const [catalogResult, customResult] = await Promise.all([
    supabase
      .from('profile_skills')
      .select('profile_id, experience_level, years_experience, sort_order, skill:skills(id, name, icon, category)')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profile_custom_skills')
      .select('id, profile_id, name, category, sort_order, created_at, updated_at')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: true }),
  ])

  if (catalogResult.error) {
    throw catalogResult.error
  }

  if (customResult.error) {
    throw customResult.error
  }

  const catalogSkills = (catalogResult.data ?? []).map((row) => {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill

    return {
      ...row,
      source: 'catalog',
      skill: skill ? { ...skill, source: 'catalog', is_custom: false } : skill,
    }
  })

  const customSkills = (customResult.data ?? []).map((row) => ({
    profile_id: row.profile_id,
    experience_level: null,
    years_experience: null,
    sort_order: row.sort_order,
    source: 'custom',
    skill: {
      id: row.id,
      name: row.name,
      icon: null,
      category: row.category,
      source: 'custom',
      is_custom: true,
    },
  }))

  return [...catalogSkills, ...customSkills]
    .filter((row) => row.skill)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order))
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
      tags,
      created_at,
      updated_at,
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
  bounds = null,
  limit = 12,
  excludeProfileId = null,
  category = null,
  searchQuery = '',
}) {
  const centerLat = toNumber(lat)
  const centerLng = toNumber(lng)
  const north = toNumber(bounds?.north)
  const south = toNumber(bounds?.south)
  const east = toNumber(bounds?.east)
  const west = toNumber(bounds?.west)
  const skillFilter = category && category !== 'all' ? String(category) : null
  const normalizedSearchQuery = String(searchQuery || '').trim().slice(0, 80)

  if (centerLat === null || centerLng === null) {
    return []
  }

  const { data, error } = await supabase.rpc('get_public_helpers_for_map', {
    p_center_lat: centerLat,
    p_center_lng: centerLng,
    p_radius_km: 10,
    p_radius_enabled: false,
    p_north: north,
    p_south: south,
    p_east: east,
    p_west: west,
    p_limit: Math.max(limit * 4, limit),
    p_exclude_profile_id: excludeProfileId,
    p_skill_filter: skillFilter,
    p_search_query: normalizedSearchQuery || null,
  })

  if (error) {
    throw error
  }

  const publicHelpers = (data ?? []).map((helper) => ({
    ...helper,
    lat: toNumber(helper.lat),
    lng: toNumber(helper.lng),
    distance_km: toNumber(helper.distance_km),
    display_name: helper.full_name,
    username: helper.username || null,
    account_status: 'active',
  }))

  if (publicHelpers.length === 0) {
    return []
  }

  const helperIds = publicHelpers.map((helper) => helper.id)

  const [catalogSkillsResult, customSkillsResult] = await Promise.all([
    supabase
      .from('profile_skills')
      .select('profile_id, sort_order, skill:skills(id, name, icon, category)')
      .in('profile_id', helperIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('profile_custom_skills')
      .select('id, profile_id, name, category, sort_order')
      .in('profile_id', helperIds)
      .order('sort_order', { ascending: true }),
  ])

  if (catalogSkillsResult.error) {
    throw catalogSkillsResult.error
  }

  if (customSkillsResult.error) {
    throw customSkillsResult.error
  }

  const skillRowsByProfileId = new Map()

  for (const row of catalogSkillsResult.data ?? []) {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill
    const current = skillRowsByProfileId.get(row.profile_id) ?? []
    current.push({
      sortOrder: Number(row.sort_order) || 0,
      skill: skill ? { ...skill, source: 'catalog', is_custom: false } : skill,
    })
    skillRowsByProfileId.set(row.profile_id, current)
  }

  for (const row of customSkillsResult.data ?? []) {
    const current = skillRowsByProfileId.get(row.profile_id) ?? []
    current.push({
      sortOrder: Number(row.sort_order) || 0,
      skill: {
        id: row.id,
        name: row.name,
        icon: null,
        category: row.category,
        source: 'custom',
        is_custom: true,
      },
    })
    skillRowsByProfileId.set(row.profile_id, current)
  }

  const queryTokens = normalizeSkillNameForComparison(normalizedSearchQuery)
    .split(/\s+/)
    .filter((token) => token.length > 1)

  function getSearchScore(skill) {
    if (queryTokens.length === 0) return 0

    const searchable = normalizeSkillNameForComparison(`${skill?.name || ''} ${skill?.category || ''}`)
    return queryTokens.reduce((score, token) => score + (searchable.includes(token) ? 1 : 0), 0)
  }

  const helpers = publicHelpers
    .map((helper) => {
      const orderedSkills = (skillRowsByProfileId.get(helper.id) ?? [])
        .filter((entry) => entry.skill)
        .sort((left, right) => {
          const scoreDifference = getSearchScore(right.skill) - getSearchScore(left.skill)
          return scoreDifference || left.sortOrder - right.sortOrder
        })
        .map((entry) => entry.skill)
        .slice(0, MAX_PROFILE_SKILLS)

      return { ...helper, skills: orderedSkills }
    })
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
