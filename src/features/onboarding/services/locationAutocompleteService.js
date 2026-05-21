const cache = new Map()

function normalize(value) {
  return (value || '').toString().trim().toLowerCase()
}

function buildDisplayAddress(item) {
  return (
    item.formatted ||
    [item.name, item.city || item.town || item.village || item.municipality, item.country]
      .filter(Boolean)
      .join(', ') ||
    ''
  )
}

function normalizeResult(item) {
  if (!item) return null

  const country = item.country || ''
  const countryCode = item.country_code ? String(item.country_code).toUpperCase() : ''
  const region = item.state || item.county || item.state_district || item.region || ''
  const municipality =
    item.municipality ||
    item.city ||
    item.town ||
    item.village ||
    item.hamlet ||
    item.locality ||
    item.suburb ||
    item.name ||
    ''
  const province = item.state || item.county || region || ''
  const formattedAddress = buildDisplayAddress(item)
  const lat = Number(item.lat)
  const lng = Number(item.lon ?? item.lng)
  const kind = item.result_type === 'state' || (!municipality && province) ? 'province' : 'municipality'

  if (!formattedAddress || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    placeId: String(item.place_id || item.id || formattedAddress),
    country,
    countryCode,
    region,
    province,
    city: municipality,
    municipality,
    formattedAddress,
    lat,
    lng,
    kind,
    raw: item,
  }
}

export async function searchLocationAutocomplete(query, { signal } = {}) {
  const search = normalize(query)

  if (search.length < 3) {
    return []
  }

  if (cache.has(search)) {
    return cache.get(search)
  }

  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY
  if (!apiKey) {
    throw new Error('Falta configurar VITE_GEOAPIFY_API_KEY.')
  }

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&format=json&limit=8&lang=es&apiKey=${apiKey}`

  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Geoapify no pudo completar la búsqueda.')
  }

  const data = await response.json()
  const items = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
  const results = items.map(normalizeResult).filter(Boolean)

  cache.set(search, results)
  return results
}
