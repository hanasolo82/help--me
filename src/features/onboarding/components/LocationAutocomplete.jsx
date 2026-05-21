import { useEffect, useRef, useState } from 'react'
import { searchLocationAutocomplete } from '../services/locationAutocompleteService'
import styles from './LocationAutocomplete.module.css'

const DEBOUNCE_MS = 400

function normalizeQuery(value) {
  return (value || '').trim()
}

export default function LocationAutocomplete({ draft, setDraft }) {
  const [query, setQuery] = useState(draft.formattedAddress || draft.municipality || draft.city || '')
  const [results, setResults] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [open, setOpen] = useState(false)
  const requestIdRef = useRef(0)

  const selectedLocation = draft.placeId
    ? {
        placeId: draft.placeId,
        country: draft.country || '',
        countryCode: draft.countryCode || '',
        region: draft.region || '',
        province: draft.province || '',
        city: draft.city || draft.municipality || '',
        municipality: draft.municipality || draft.city || '',
        formattedAddress: draft.formattedAddress || draft.displayLocation || '',
        lat: draft.lat,
        lng: draft.lng,
      }
    : null

  useEffect(() => {
    setQuery(draft.formattedAddress || draft.displayLocation || draft.municipality || draft.city || '')
  }, [draft.city, draft.displayLocation, draft.formattedAddress, draft.municipality])

  useEffect(() => {
    if (manualMode) {
      setStatus('idle')
      setError('')
      setResults([])
      return undefined
    }

    const search = normalizeQuery(query)
    if (search.length < 3) {
      setStatus('idle')
      setError('')
      setResults([])
      return undefined
    }

    const currentRequestId = requestIdRef.current + 1
    requestIdRef.current = currentRequestId
    const controller = new AbortController()

    setStatus('loading')
    setError('')

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
  }, [manualMode, query])

  function applySelection(location) {
    setQuery(location.formattedAddress)
    setResults([])
    setStatus('idle')
    setError('')
    setManualMode(false)

    setDraft((current) => ({
      ...current,
      country: location.country || current.country || '',
      countryCode: location.countryCode || current.countryCode || '',
      region: location.region || current.region || '',
      province: location.province || current.province || '',
      city: location.city || location.municipality || current.city || '',
      municipality: location.municipality || location.city || current.municipality || '',
      formattedAddress: location.formattedAddress || '',
      displayLocation: location.formattedAddress || '',
      lat: location.lat,
      lng: location.lng,
      placeId: location.placeId,
      neighborhood: location.municipality || location.city || current.neighborhood || '',
    }))
  }

  function clearSelection() {
    setQuery('')
    setResults([])
    setStatus('idle')
    setError('')
    setOpen(false)

    setDraft((current) => ({
      ...current,
      country: '',
      countryCode: '',
      region: '',
      province: '',
      city: '',
      municipality: '',
      formattedAddress: '',
      displayLocation: '',
      lat: null,
      lng: null,
      placeId: '',
      neighborhood: '',
    }))
  }

  function handleChange(event) {
    const nextValue = event.target.value.slice(0, 120)
    setQuery(nextValue)
    setOpen(true)

    setDraft((current) => ({
      ...current,
      formattedAddress: nextValue,
      displayLocation: nextValue,
      country: manualMode ? current.country : '',
      countryCode: manualMode ? current.countryCode : '',
      region: manualMode ? current.region : '',
      province: manualMode ? current.province : '',
      city: manualMode ? nextValue : '',
      municipality: manualMode ? nextValue : '',
      lat: manualMode ? current.lat : null,
      lng: manualMode ? current.lng : null,
      placeId: manualMode ? current.placeId : '',
      neighborhood: manualMode ? nextValue : '',
    }))
  }

  function handleBlur() {
    window.setTimeout(() => setOpen(false), 150)
  }

  const showResults = open && !manualMode && query.trim().length >= 3
  const noResults = showResults && status === 'success' && results.length === 0
  const canSearch = query.trim().length >= 3

  return (
    <div className={styles.root}>
      {selectedLocation ? (
        <div className={styles.selectedCard}>
          <strong>Ubicación seleccionada</strong>
          <p className={styles.selectedMeta}>{selectedLocation.formattedAddress}</p>
          <p className={styles.selectedMeta}>
            {selectedLocation.municipality || 'Municipio no indicado'} · {selectedLocation.region || selectedLocation.province || 'Región no indicada'}
          </p>
          <div className={styles.helperRow}>
            <button type="button" className={styles.manualButton} onClick={() => setManualMode(true)}>
              Cambiar ubicación
            </button>
            <button type="button" className={styles.clearButton} onClick={clearSelection}>
              Borrar selección
            </button>
          </div>
        </div>
      ) : null}

      {!selectedLocation || manualMode ? (
        <label className="field">
          <span>Ciudad, municipio o zona</span>
          <input
            value={query}
            onChange={handleChange}
            onFocus={() => setOpen(true)}
            onBlur={handleBlur}
            placeholder="Escribe una ciudad, municipio o zona"
          />
        </label>
      ) : (
        <p className={styles.manualHint}>
          Puedes cambiar o borrar la ubicación seleccionada cuando quieras.
        </p>
      )}

      <div className={styles.statusRow}>
        {status === 'loading' ? <p className={styles.statusText}>Buscando ubicaciones...</p> : null}
        {error ? <p className={styles.errorText}>{error}</p> : null}
        {!manualMode && canSearch && status === 'success' && results.length === 0 ? (
          <p className={styles.statusText}>No encontramos resultados</p>
        ) : null}
      </div>

      {showResults ? (
        <div className={styles.results}>
          {results.map((location) => (
            <button
              key={location.placeId}
              type="button"
              className={styles.resultButton}
              onClick={() => applySelection(location)}
            >
              <span className={styles.resultKind}>{location.kind === 'province' ? 'Provincia' : 'Municipio'}</span>
              <strong className={styles.resultLabel}>{location.formattedAddress}</strong>
              <span className={styles.resultSub}>
                {location.city || location.municipality || 'Sin municipio'} · {location.region || location.province || location.country || 'Sin región'}
              </span>
            </button>
          ))}

          {noResults ? <p className={styles.statusText}>No encontramos resultados</p> : null}
        </div>
      ) : null}

      <div className={styles.helperRow}>
        {!manualMode ? (
          <button
            type="button"
            className={styles.manualButton}
            onClick={() => setManualMode(true)}
          >
            Escribir manualmente
          </button>
        ) : (
          <p className={styles.manualHint}>
            Modo manual activado. Puedes escribir tu ubicación sin usar sugerencias.
          </p>
        )}
        {manualMode ? (
          <button
            type="button"
            className={styles.manualButton}
            onClick={() => setManualMode(false)}
          >
            Volver a sugerencias
          </button>
        ) : null}
      </div>
    </div>
  )
}
