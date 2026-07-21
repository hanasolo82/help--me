// QA de búsqueda global en los mapas.
//
//   pnpm run verify:global-map-search
//
// Requiere server/.env con SUPABASE_URL, SUPABASE_ANON_KEY y
// SUPABASE_SERVICE_ROLE_KEY. Crea perfiles y habilidades temporales, y los
// elimina al terminar.

import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: resolve(process.cwd(), 'server/.env') })

const SUPABASE_URL = process.env.SUPABASE_URL?.trim()
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY?.trim()
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

for (const [key, value] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY })) {
  if (!value) throw new Error(`Missing required env var: ${key}. Load server/.env before running the check.`)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const visitor = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
})

const results = []

function record(id, description, pass, detail = '') {
  results.push({ id, pass })
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} · ${description}${detail ? ` — ${detail}` : ''}`)
}

function buildUsername() {
  return `ms_${randomUUID().slice(0, 12).replace(/-/g, '')}`.toLowerCase()
}

async function createUser(label) {
  const email = `map-search-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.com`
  const password = `MapSearch-${randomUUID()}!a1`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Map Search ${label}` },
  })

  if (error) throw error
  return { id: data.user.id, email, password }
}

async function userClient(user) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password })
  if (error) throw error
  return client
}

async function createProfile(user, label, overrides = {}) {
  const { error } = await admin.from('profiles').upsert(
    {
      id: user.id,
      username: buildUsername(),
      full_name: `Map Search ${label}`,
      display_name: `Map Search ${label}`,
      account_status: 'active',
      helper_status: 'active',
      availability_enabled: true,
      accepts_direct_requests: true,
      show_approx_location: true,
      neighborhood: 'Zona de prueba',
      city: 'Madrid',
      country: 'España',
      rating: 4.5,
      completed_tasks: 3,
      reviews_count: 2,
      ...overrides,
    },
    { onConflict: 'id' },
  )

  if (error) throw error
}

async function replaceSkills(client, items) {
  const { error } = await client.rpc('replace_own_profile_skills', { p_items: items })
  if (error) throw error
}

async function searchHelpers(searchQuery = null) {
  const { data, error } = await visitor.rpc('get_public_helpers_for_map', {
    p_center_lat: 40.4168,
    p_center_lng: -3.7038,
    p_radius_km: 10,
    p_radius_enabled: false,
    p_north: 40.55,
    p_south: 40.25,
    p_east: -3.5,
    p_west: -3.9,
    p_limit: 32,
    p_exclude_profile_id: null,
    p_skill_filter: null,
    p_search_query: searchQuery,
  })

  if (error) throw error
  return data ?? []
}

async function main() {
  const userIds = []

  try {
    const { data: catalogSkills, error: catalogError } = await admin
      .from('skills')
      .select('id, name')
      .eq('name', 'Montaje de muebles')
      .eq('is_active', true)
      .limit(1)
    if (catalogError) throw catalogError

    const furnitureSkill = catalogSkills?.[0]
    if (!furnitureSkill) {
      throw new Error('Missing catalog skill "Montaje de muebles" required by migration 0055.')
    }

    const nearCatalog = await createUser('near-catalog')
    const farCatalog = await createUser('far-catalog')
    const farCustom = await createUser('far-custom')
    const inactive = await createUser('inactive')
    const suspended = await createUser('suspended')
    const unavailable = await createUser('unavailable')
    userIds.push(nearCatalog.id, farCatalog.id, farCustom.id, inactive.id, suspended.id, unavailable.id)

    await Promise.all([
      createProfile(nearCatalog, 'near-catalog', { lat: 40.4168, lng: -3.7038 }),
      createProfile(farCatalog, 'far-catalog', { lat: 41.3874, lng: 2.1686, city: 'Barcelona' }),
      createProfile(farCustom, 'far-custom', { lat: 41.3851, lng: 2.1734, city: 'Barcelona' }),
      createProfile(inactive, 'inactive', { lat: 40.4178, lng: -3.7048, helper_status: 'not_started' }),
      createProfile(suspended, 'suspended', { lat: 40.4188, lng: -3.7058, account_status: 'suspended' }),
      createProfile(unavailable, 'unavailable', { lat: 40.4198, lng: -3.7068, availability_enabled: false }),
    ])

    const [nearCatalogClient, farCatalogClient, farCustomClient, inactiveClient, suspendedClient, unavailableClient] = await Promise.all([
      userClient(nearCatalog),
      userClient(farCatalog),
      userClient(farCustom),
      userClient(inactive),
      userClient(suspended),
      userClient(unavailable),
    ])

    await Promise.all([
      replaceSkills(nearCatalogClient, [{ source: 'catalog', id: furnitureSkill.id }]),
      replaceSkills(farCatalogClient, [{ source: 'catalog', id: furnitureSkill.id }]),
      replaceSkills(farCustomClient, [{ source: 'custom', name: 'Cortar pelo', category: 'Personas' }]),
      replaceSkills(inactiveClient, [{ source: 'custom', name: 'Cortar pelo', category: 'Personas' }]),
      replaceSkills(suspendedClient, [{ source: 'custom', name: 'Cortar pelo', category: 'Personas' }]),
      replaceSkills(unavailableClient, [{ source: 'custom', name: 'Cortar pelo', category: 'Personas' }]),
    ])

    const catalogResults = await searchHelpers('montar muebles')
    const catalogIds = catalogResults.map((helper) => helper.id)
    const nearCatalogIndex = catalogIds.indexOf(nearCatalog.id)
    const farCatalogIndex = catalogIds.indexOf(farCatalog.id)

    record(
      'G1-catalog-viewport',
      'Una habilidad de catálogo encuentra un helper dentro del viewport',
      nearCatalogIndex !== -1,
      `resultados=${catalogResults.length}`,
    )
    record(
      'G1-catalog-global',
      'La misma búsqueda encuentra un helper fuera del viewport',
      farCatalogIndex !== -1,
      `cercano=${nearCatalogIndex} exterior=${farCatalogIndex}`,
    )
    record(
      'G1-ranking-and-shape',
      'Todos los términos, relevancia y distancia producen un orden y metadatos deterministas',
      nearCatalogIndex !== -1
        && farCatalogIndex !== -1
        && nearCatalogIndex < farCatalogIndex
        && Number.isFinite(Number(catalogResults[0]?.search_rank))
        && Number(catalogResults[0]?.total_count) >= 2,
      `rank=${catalogResults[0]?.search_rank ?? 'n/a'} total=${catalogResults[0]?.total_count ?? 'n/a'}`,
    )

    const customResults = await searchHelpers('cortar pelo')
    const customIds = customResults.map((helper) => helper.id)
    record(
      'G1-custom-global',
      'Una habilidad propia es localizable fuera del viewport',
      customIds.includes(farCustom.id),
      `resultados=${customResults.length}`,
    )
    record(
      'G1-private-helper-gates',
      'Perfiles inactivos, suspendidos o no disponibles no aparecen',
      !customIds.includes(inactive.id)
        && !customIds.includes(suspended.id)
        && !customIds.includes(unavailable.id),
      `inactivo=${customIds.includes(inactive.id)} suspendido=${customIds.includes(suspended.id)} no-disponible=${customIds.includes(unavailable.id)}`,
    )

    const viewportResults = await searchHelpers()
    record(
      'G1-no-query-viewport',
      'Sin texto, un helper exterior sigue excluido por el viewport',
      viewportResults.some((helper) => helper.id === nearCatalog.id)
        && !viewportResults.some((helper) => helper.id === farCatalog.id)
        && !viewportResults.some((helper) => helper.id === farCustom.id),
      `resultados=${viewportResults.length}`,
    )

    const shortQueryResults = await searchHelpers('mo')
    record(
      'G1-short-query-viewport',
      'Una consulta de menos de tres caracteres no activa la búsqueda global',
      shortQueryResults.some((helper) => helper.id === nearCatalog.id)
        && !shortQueryResults.some((helper) => helper.id === farCatalog.id),
      `resultados=${shortQueryResults.length}`,
    )

    record(
      'G1-single-function',
      'La RPC se resuelve con la única definición protegida por la aserción pg_proc de 0056',
      Array.isArray(catalogResults)
        && catalogResults.every((helper) => (
          Object.hasOwn(helper, 'search_rank') && Object.hasOwn(helper, 'total_count')
        )),
      'La migración falla si existe un overload adicional.',
    )
  } catch (error) {
    record('SETUP', 'Error de preparación', false, error?.message || String(error))
  } finally {
    if (userIds.length) {
      await admin.from('profile_custom_skills').delete().in('profile_id', userIds)
      await admin.from('profile_skills').delete().in('profile_id', userIds)
      await admin.from('profiles').delete().in('id', userIds)

      for (const userId of userIds) {
        await admin.auth.admin.deleteUser(userId)
      }
    }
  }

  const failures = results.filter((result) => !result.pass)
  console.log('\n--- RESUMEN ---')
  console.log(`Total: ${results.length} · OK: ${results.length - failures.length} · FAIL: ${failures.length}`)

  if (failures.length) {
    console.log('Fallaron:', failures.map((result) => result.id).join(', '))
    process.exitCode = 1
  } else {
    console.log('Búsqueda global: alcance, privacidad y ranking verificados.')
  }
}

main()
