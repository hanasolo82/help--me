import { useEffect, useRef, useState } from 'react'
import { searchLocationAutocomplete } from '../../../onboarding/services/locationAutocompleteService'
import styles from './RequestTaskModal.module.css'

const DEBOUNCE_MS = 350

function getLocationLabel(location) {
  return location?.label || ''
}

function normalizeSearch(value) {
  return (value || '').trim()
}

export default function TaskLocationSearch({ value, onChange }) {
  const [query, setQuery] = useState(() => getLocationLabel(value))
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!value) return

    const label = getLocationLabel(value)
    if (label) {
      let cancelled = false

      queueMicrotask(() => {
        if (cancelled) return
        setQuery(label)
      })

      return () => {
        cancelled = true
      }
    }

    return undefined
  }, [value])

  useEffect(() => {
    const search = normalizeSearch(query)

    if (search.length < 3) {
      let cancelled = false

      queueMicrotask(() => {
        if (cancelled) return
        setStatus('idle')
        setError('')
        setResults([])
      })

      return () => {
        cancelled = true
      }
    }

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    const controller = new AbortController()

    queueMicrotask(() => {
      if (requestIdRef.current !== currentRequestId) return
      setStatus('loading')
      setError('')
    })

    const timer = window.setTimeout(async () => {
      try {
        const nextResults = await searchLocationAutocomplete(search, { signal: controller.signal })

        if (requestIdRef.current !== currentRequestId) {
          return
        }

        setResults(nextResults)
        setStatus('success')
      } catch (nextError) {
        if (controller.signal.aborted || requestIdRef.current !== currentRequestId) {
          return
        }

        setResults([])
        setStatus('error')
        setError(nextError?.message || 'No pudimos completar la busqueda.')
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  function handleChange(event) {
    const nextValue = event.target.value.slice(0, 140)
    setQuery(nextValue)
    setOpen(true)
    setError('')

    if (value) {
      onChange?.(null)
    }
  }

  function handleBlur() {
    window.setTimeout(() => setOpen(false), 150)
  }

  function applySelection(location) {
    const lat = Number(location?.lat)
    const lng = Number(location?.lng)

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return
    }

    const label = location.formattedAddress || location.city || location.municipality || query
    setQuery(label)
    setResults([])
    setStatus('idle')
    setError('')
    setOpen(false)
    onChange?.({ lat, lng, label })
  }

  const showResults = open && query.trim().length >= 3
  const noResults = showResults && status === 'success' && results.length === 0
  const hasSelectedLocation =
    Number.isFinite(Number(value?.lat)) &&
    Number.isFinite(Number(value?.lng))

  return (
    <div className={styles.locationSearch}>
      <label className="field">
        <span>Lugar de la tarea</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Busca una calle, zona o ciudad"
          autoComplete="off"
          required
        />
      </label>

      {showResults ? (
        <section className={styles.locationResults} aria-label="Resultados de ubicacion">
          {status === 'loading' ? <p className={styles.locationStatus}>Buscando ubicaciones...</p> : null}
          {error ? <p className={styles.locationError}>{error}</p> : null}
          {results.map((location) => (
            <button
              key={location.placeId}
              type="button"
              className={styles.locationResult}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applySelection(location)}
            >
              <strong>{location.formattedAddress}</strong>
              <span>
                {location.city || location.municipality || 'Zona'} · {location.region || location.province || location.country || 'Ubicacion'}
              </span>
            </button>
          ))}
          {noResults ? <p className={styles.locationStatus}>No encontramos esa ubicacion</p> : null}
        </section>
      ) : null}

      <p className={hasSelectedLocation ? styles.locationSelected : styles.locationStatus}>
        {hasSelectedLocation
          ? `Waypoint seleccionado: ${value.label || 'ubicacion elegida'}`
          : 'Selecciona un resultado para fijar el waypoint visible de la tarea.'}
      </p>
    </div>
  )
}
