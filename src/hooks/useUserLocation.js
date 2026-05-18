import { useCallback, useState } from 'react'

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
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: 'Ubicacion precisa',
        })
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
