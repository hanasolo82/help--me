import { useEffect, useRef, useState } from 'react'
import { searchLocationAutocomplete } from '../../../features/onboarding/services/locationAutocompleteService'
import styles from '../SettingsPage.module.css'

const DEBOUNCE_MS = 350

function normalizeSearch(value) {
  return String(value || '').trim()
}

function buildLabel(location, fallback = '') {
  return location?.formattedAddress || location?.city || location?.municipality || fallback
}

export default function HabitualLocationSearch({ form, setField }) {
  const [query, setQuery] = useState(form.habitualLocationLabel || form.visibleZoneName || '')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const nextQuery = form.habitualLocationLabel || form.visibleZoneName || ''
    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setQuery(nextQuery)
    })

    return () => {
      cancelled = true
    }
  }, [form.habitualLocationLabel, form.visibleZoneName])

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
        setError(nextError?.message || 'No pudimos completar la búsqueda.')
      }
    }, DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query])

  function handleChange(event) {
    const nextValue = event.target.value.slice(0, 160)
    setQuery(nextValue)
    setOpen(true)
    setError('')
    setField('habitualLocationLabel', nextValue)
    setField('visibleZoneName', nextValue)
    setField('lat', null)
    setField('lng', null)
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

    const label = buildLabel(location, query)
    setQuery(label)
    setResults([])
    setStatus('idle')
    setError('')
    setOpen(false)

    setField('habitualLocationLabel', label)
    setField('visibleZoneName', label)
    setField('lat', lat)
    setField('lng', lng)
    setField('city', location.city || location.municipality || '')
    setField('neighborhood', location.municipality || location.city || label)
    setField('country', location.country || '')
  }

  const showResults = open && query.trim().length >= 3
  const noResults = showResults && status === 'success' && results.length === 0
  const hasSelectedLocation = Number.isFinite(Number(form.lat)) && Number.isFinite(Number(form.lng))

  return (
    <div className={styles.habitualLocationSearch}>
      <label className={styles.mapSearchField}>
        <span>Seleccionar ubicación habitual</span>
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder="Busca una ciudad, barrio o zona"
          autoComplete="off"
        />
      </label>

      {showResults ? (
        <section className={styles.mapSearchResults} aria-label="Resultados de ubicación habitual">
          {status === 'loading' ? <p className={styles.mapSearchStatus}>Buscando ubicaciones...</p> : null}
          {error ? <p className={styles.mapSearchError}>{error}</p> : null}
          {results.map((location) => (
            <button
              key={location.placeId}
              type="button"
              className={styles.mapSearchResult}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applySelection(location)}
            >
              <strong>{location.formattedAddress}</strong>
              <span>
                {location.city || location.municipality || 'Zona'} · {location.region || location.province || location.country || 'Ubicación'}
              </span>
            </button>
          ))}
          {noResults ? <p className={styles.mapSearchStatus}>No encontramos esa ubicación</p> : null}
        </section>
      ) : null}

      <p className={hasSelectedLocation ? styles.mapSearchSelected : styles.mapSearchStatus}>
        {hasSelectedLocation
          ? `Ubicación habitual seleccionada: ${form.habitualLocationLabel || form.visibleZoneName || 'zona elegida'}`
          : 'Selecciona un resultado para poder aparecer en el mapa de forma aproximada.'}
      </p>
    </div>
  )
}
