const GEOJS_URL = 'https://get.geojs.io/v1/ip/geo.json'

// Pide ubicacion precisa al navegador. En movil dispara el permiso del sistema/navegador.
function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation no esta disponible en este dispositivo.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          source: 'browser',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: 'Ubicacion precisa',
        })
      },
      reject,
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    )
  })
}

// Fallback ligero por IP si el usuario rechaza permisos o el navegador no da coordenadas.
async function getGeoJsLocation() {
  const response = await fetch(GEOJS_URL)

  if (!response.ok) {
    throw new Error('GeoJS no pudo resolver la ubicacion aproximada.')
  }

  const data = await response.json()

  return {
    source: 'geojs',
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    accuracy: null,
    label: [data.city, data.region, data.country].filter(Boolean).join(' · ') || 'Ubicacion aproximada',
  }
}

// Estrategia principal de ubicacion: primero GPS/navegador, despues aproximacion por GeoJS.
export async function resolveUserLocation() {
  try {
    return await getBrowserLocation()
  } catch {
    return getGeoJsLocation()
  }
}

const EARTH_RADIUS_KM = 6371

function toRadians(degrees) {
  return (degrees * Math.PI) / 180
}

// Distancia Haversine en kilometros entre dos puntos lat/lon. Devuelve null si falta dato.
export function distanceKm(from, to) {
  if (!from || !to) return null
  const lat1 = Number(from.latitude)
  const lon1 = Number(from.longitude)
  const lat2 = Number(to.latitude)
  const lon2 = Number(to.longitude)
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null

  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return Number((EARTH_RADIUS_KM * c).toFixed(2))
}
