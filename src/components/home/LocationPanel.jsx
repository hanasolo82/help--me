import styles from '../../pages/Home/Home.module.css'

export default function LocationPanel({
  status,
  locationLabel,
  showApproxLocation,
  error,
  onRequestLocation,
  onClearLocation,
  onDismiss,
}) {
  const statusText =
    status === 'loading'
      ? 'Solicitando ubicacion...'
      : status === 'success'
        ? showApproxLocation && locationLabel
          ? `Ubicacion activa: ${locationLabel}`
          : 'Ubicacion activa'
        : status === 'denied'
          ? 'Permiso de ubicacion denegado.'
          : status === 'error'
            ? 'No se pudo activar la ubicacion.'
            : 'Activa tu ubicacion para calcular trabajos cercanos.'

  return (
    <div className={styles.permissionPanel}>
      <div className={styles.permissionStatusRow}>
        <strong>{statusText}</strong>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {status === 'success' && (
            <button type="button" className={styles.mapButton} onClick={onClearLocation}>
              Quitar
            </button>
          )}
          <button
            type="button"
            className={styles.locationCloseButton}
            onClick={onDismiss}
            aria-label="Cerrar ubicacion"
          >
            ×
          </button>
        </div>
      </div>

      <p>
        Activa permisos de ubicacion para calcular tareas cercanas sin mostrar tu coordenada exacta.
      </p>

      {error && <p className="auth-message error">{error}</p>}

      <button
        type="button"
        className={styles.mapButton}
        onClick={onRequestLocation}
        disabled={status === 'loading'}
      >
        {status === 'success' ? 'Actualizar ubicacion' : 'Usar mi ubicacion'}
      </button>
    </div>
  )
}

