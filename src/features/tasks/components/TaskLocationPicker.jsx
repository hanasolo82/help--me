import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { reverseGeocodeLocation } from '../../../services/locationService'
import MapTileLayer from '../../../shared/ui/map/MapTileLayer'
import styles from './TaskLocationPicker.module.css'

const DEFAULT_CENTER = [41.6523, -0.9019]

function createPointIcon(isSelected = false) {
  return L.divIcon({
    className: `${styles.pointMarker} ${isSelected ? styles.pointMarkerActive : ''}`.trim(),
    html: '<span></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function RecenterOnChange({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true })
  }, [center, map])

  return null
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    },
  })

  return null
}

function buildLabel(point) {
  if (!point) return 'Selecciona un punto en el mapa'
  return point.label || 'Punto seleccionado'
}

export default function TaskLocationPicker({ value, onChange, center, centerLabel, onRequestCenter, missing = false }) {
  const [open, setOpen] = useState(false)
  const [draftPoint, setDraftPoint] = useState(value || null)
  const [addressLabel, setAddressLabel] = useState(value?.label || '')
  const [addressStatus, setAddressStatus] = useState('idle')
  const [addressError, setAddressError] = useState('')

  const resolvedCenter = useMemo(() => {
    if (draftPoint) {
      return [draftPoint.latitude, draftPoint.longitude]
    }

    if (center && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)) {
      return [center.latitude, center.longitude]
    }

    return DEFAULT_CENTER
  }, [center, draftPoint])

  useEffect(() => {
    let cancelled = false

    async function resolveAddress() {
      if (!draftPoint?.latitude || !draftPoint?.longitude) {
        setAddressLabel(draftPoint?.label || '')
        setAddressStatus('idle')
        setAddressError('')
        return
      }

      setAddressStatus('loading')
      setAddressError('')

      try {
        const result = await reverseGeocodeLocation(draftPoint.latitude, draftPoint.longitude)
        if (cancelled) return

        setAddressLabel(result?.label || '')
        setAddressStatus('success')
      } catch (error) {
        if (cancelled) return

        setAddressStatus('error')
        setAddressError(error?.message || 'No pudimos resolver la calle de este punto.')
      }
    }

    if (open && draftPoint) {
      resolveAddress()
    }

    return () => {
      cancelled = true
    }
  }, [draftPoint, open, value])

  const displayLabel = addressLabel || value?.label || 'Punto seleccionado'

  function openPicker() {
    setDraftPoint(value || null)
    setAddressLabel(value?.label || '')
    setOpen(true)
    onRequestCenter?.()
  }

  function closePicker() {
    setOpen(false)
  }

  function handleSave() {
    if (!draftPoint) return
    onChange?.({
      ...draftPoint,
      label: displayLabel || draftPoint.label || null,
    })
    setOpen(false)
  }

  return (
    <div className={styles.shell}>
      <div className={missing ? `${styles.summary} ${styles.summaryMissing}` : styles.summary}>
        <div>
          <span className={styles.label}>Ubicación de la tarea {missing ? <em className={styles.requiredTag}>obligatoria</em> : null}</span>
          <strong>{value?.label || buildLabel(value)}</strong>
        </div>
        <button type="button" className="secondary-action" onClick={openPicker}>
          {value ? 'Cambiar punto en mapa' : 'Elegir punto en mapa'}
        </button>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className="eyebrow">Mapa de la tarea</p>
              <h2>Selecciona el punto exacto</h2>
              <p className="muted">{centerLabel || 'Haz clic sobre el mapa para marcar donde se hace la tarea.'}</p>
            </div>
            <button type="button" className="secondary-action" onClick={closePicker}>
              Cerrar
            </button>
          </div>

          <div className={styles.mapShell}>
            <MapContainer center={resolvedCenter} zoom={14} scrollWheelZoom className={styles.map}>
              <RecenterOnChange center={resolvedCenter} />
              <MapTileLayer />
              <MapClickHandler onPick={setDraftPoint} />
              {draftPoint ? (
                <Marker
                  position={[draftPoint.latitude, draftPoint.longitude]}
                  icon={createPointIcon(true)}
                />
              ) : null}
            </MapContainer>
          </div>

          <div className={styles.footer}>
            <div className={styles.coordsBox}>
              <span>{addressStatus === 'loading' ? 'Buscando calle...' : 'Dirección exacta'}</span>
              <strong>{displayLabel || 'Selecciona un punto en el mapa'}</strong>
              {addressError ? <p className="muted">No pudimos resolver la calle exacta, pero el punto queda guardado.</p> : null}
            </div>
            <div className={styles.footerActions}>
              <button
                type="button"
                className="secondary-action"
                onClick={() => {
                  setDraftPoint(null)
                }}
              >
                Limpiar punto
              </button>
              <button type="button" className="primary-action" onClick={handleSave} disabled={!draftPoint}>
                Guardar ubicación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
