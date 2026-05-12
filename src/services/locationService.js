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
