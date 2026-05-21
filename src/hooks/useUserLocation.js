import { useCallback, useState } from 'react'
import { reverseGeocodeLocation } from '../services/locationService'

function buildReadableLocationLabel(place) {
  if (!place) return 'Tu zona'

  const parts = [place.neighborhood, place.city, place.province, place.country].filter(Boolean)

  if (parts.length === 0) {
    return 'Tu zona'
  }

  return parts.slice(0, 2).join(' · ')
}

export function useUserLocation() {
  const [location, setLocation] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const requestLocation = useCallback(() => {
    setError('')

    if (!navigator.geolocation) {
      setStatus('error')
      setError('La geolocalizacion no esta disponible en este dispositivo.')
      return
    }

    setStatus('loading')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude

        try {
          const place = await reverseGeocodeLocation(lat, lng)

          setLocation({
            lat,
            lng,
            accuracy: position.coords.accuracy,
            label: buildReadableLocationLabel(place),
            neighborhood: place?.neighborhood || null,
            city: place?.city || null,
            province: place?.province || null,
            country: place?.country || null,
          })
        } catch {
          setLocation({
            lat,
            lng,
            accuracy: position.coords.accuracy,
            label: 'Tu zona',
          })
        }

        setStatus('success')
      },
      (geoError) => {
        if (geoError?.code === 1) {
          setStatus('denied')
          setError('Has denegado el acceso a la ubicacion.')
          return
        }

        setStatus('error')
        setError(geoError?.message || 'No se pudo obtener la ubicacion.')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      },
    )
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setStatus('idle')
    setError('')
  }, [])

  return {
    location,
    status,
    error,
    requestLocation,
    clearLocation,
  }
}
