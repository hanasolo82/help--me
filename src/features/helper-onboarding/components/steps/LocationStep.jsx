import { useEffect, useMemo, useRef, useState } from 'react'
import StepFrame from './StepFrame'
import styles from './LocationStep.module.css'

function updateJourneyDraft(setJourneyDraft, patch) {
  if (typeof setJourneyDraft !== 'function') return

  setJourneyDraft((current) => ({
    ...current,
    ...patch,
  }))
}

function getFriendlyError(error) {
  if (!error) return ''

  if (error.code === error.PERMISSION_DENIED || error.code === 1) {
    return 'Has bloqueado el acceso a la ubicación. Puedes cambiarlo desde los ajustes del navegador.'
  }

  if (error.code === error.POSITION_UNAVAILABLE || error.code === 2) {
    return 'No pudimos detectar tu ubicación ahora mismo. Prueba de nuevo en unos segundos.'
  }

  if (error.code === error.TIMEOUT || error.code === 3) {
    return 'La ubicación tardó demasiado en responder. Inténtalo otra vez.'
  }

  return 'No pudimos obtener tu ubicación. Inténtalo otra vez cuando quieras.'
}

export default function LocationStep({ onNext, onBack, setJourneyDraft }) {
  const [permissionState, setPermissionState] = useState('prompt')
  const [switchEnabled, setSwitchEnabled] = useState(false)
  const [checkingPermission, setCheckingPermission] = useState(true)
  const [requestingLocation, setRequestingLocation] = useState(false)
  const [feedback, setFeedback] = useState('')
  const permissionStatusRef = useRef(null)

  const statusTone = useMemo(() => {
    if (checkingPermission || requestingLocation) return 'loading'
    if (permissionState === 'granted' && switchEnabled) return 'success'
    if (permissionState === 'denied') return 'denied'
    if (!switchEnabled) return 'idle'
    return 'success'
  }, [checkingPermission, permissionState, requestingLocation, switchEnabled])

  useEffect(() => {
    let cancelled = false

    async function bootstrapPermission() {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!cancelled) {
          setPermissionState('prompt')
          setSwitchEnabled(false)
          setFeedback('Tu navegador no expone geolocalización todavía.')
          setCheckingPermission(false)
        }
        return
      }

      if (!navigator.permissions?.query) {
        if (!cancelled) {
          setPermissionState('prompt')
          setSwitchEnabled(false)
          setFeedback('Activa la ubicación manualmente para decidir si quieres aparecer en el mapa.')
          setCheckingPermission(false)
        }
        return
      }

      try {
        const status = await navigator.permissions.query({ name: 'geolocation' })
        if (cancelled) return

        permissionStatusRef.current = status
        setPermissionState(status.state)

        if (status.state === 'granted') {
          setSwitchEnabled(true)
          setFeedback('Ubicación activada. Te mostraremos de forma aproximada en el mapa.')
          requestCurrentPosition({ silent: true })
        } else if (status.state === 'denied') {
          setSwitchEnabled(false)
          setFeedback('Has bloqueado el acceso a la ubicación. Puedes cambiarlo desde los ajustes del navegador.')
        } else {
          setSwitchEnabled(false)
          setFeedback('Actívalo cuando quieras para pedir permiso al navegador.')
        }

        status.onchange = () => {
          if (cancelled) return
          setPermissionState(status.state)

          if (status.state === 'granted') {
            setSwitchEnabled(true)
            setFeedback('Ubicación activada. Te mostraremos de forma aproximada en el mapa.')
            requestCurrentPosition({ silent: true })
            return
          }

          setSwitchEnabled(false)

          if (status.state === 'denied') {
            setFeedback('Has bloqueado el acceso a la ubicación. Puedes cambiarlo desde los ajustes del navegador.')
          } else {
            setFeedback('Activa la ubicación cuando quieras para empezar a mostrarte cerca de tu zona.')
          }
        }
      } catch {
        if (!cancelled) {
          setPermissionState('prompt')
          setSwitchEnabled(false)
          setFeedback('Actívalo cuando quieras para pedir permiso al navegador.')
        }
      } finally {
        if (!cancelled) {
          setCheckingPermission(false)
        }
      }
    }

    bootstrapPermission()

    return () => {
      cancelled = true
      if (permissionStatusRef.current) {
        permissionStatusRef.current.onchange = null
      }
    }
    // requestCurrentPosition is defined later and stable within this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function requestCurrentPosition({ silent = false } = {}) {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        const error = new Error('Geolocalización no disponible.')
        setFeedback('Tu navegador no expone geolocalización todavía.')
        reject(error)
        return
      }

      setRequestingLocation(true)
      if (!silent) {
        setFeedback('Solicitando permiso para usar tu ubicación...')
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position?.coords?.latitude)
          const lng = Number(position?.coords?.longitude)
          const accuracy = Number(position?.coords?.accuracy)

          setPermissionState('granted')
          setSwitchEnabled(true)
          setFeedback('Ubicación lista. Tu perfil podrá mostrarse de forma aproximada.')
          updateJourneyDraft(setJourneyDraft, {
            lat,
            lng,
            accuracy: Number.isFinite(accuracy) ? accuracy : null,
            visibilityEnabled: true,
          })
          setRequestingLocation(false)
          resolve({ lat, lng, accuracy })
        },
        (error) => {
          const friendlyError = getFriendlyError(error)
          setPermissionState(error?.code === error.PERMISSION_DENIED || error?.code === 1 ? 'denied' : 'prompt')
          setSwitchEnabled(false)
          setFeedback(friendlyError)
          updateJourneyDraft(setJourneyDraft, {
            visibilityEnabled: false,
          })
          setRequestingLocation(false)
          reject(error)
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        },
      )
    })
  }

  async function handleToggle() {
    if (checkingPermission || requestingLocation) return

    if (switchEnabled) {
      setSwitchEnabled(false)
      setFeedback('Tu visibilidad en el mapa se ha desactivado.')
      updateJourneyDraft(setJourneyDraft, {
        visibilityEnabled: false,
      })
      return
    }

    try {
      await requestCurrentPosition()
    } catch {
      // El feedback ya se actualiza en requestCurrentPosition.
    }
  }

  const statusLabel =
    checkingPermission || requestingLocation
      ? 'Comprobando'
      : permissionState === 'granted' && switchEnabled
        ? 'Activo'
        : permissionState === 'denied'
          ? 'Bloqueado'
          : 'Inactivo'

  return (
    <StepFrame
      kicker="Ubicación"
      title="Haz que las personas cercanas puedan encontrarte"
      lead="Activa tu ubicación para aparecer en el mapa y recibir solicitudes cerca de ti."
      footer={
        <p className="muted">
          Solo mostramos una ubicación aproximada para proteger tu privacidad.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className="primary-action" onClick={onNext}>
            Continuar
          </button>
        </>
      }
    >
      <article className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.iconWrap} aria-hidden="true">
            <span>📍</span>
          </div>

          <div className={styles.copy}>
            <div className={styles.titleRow}>
              <div className={styles.headingCopy}>
                <p className={styles.cardKicker}>Ubicación</p>
                <h3>Mostrarme cerca de mi zona</h3>
              </div>
            </div>

            <p className={styles.description}>
              Permite que personas cercanas puedan encontrarte cuando necesiten ayuda.
            </p>

            <div className={styles.feedback} aria-live="polite">
              {checkingPermission ? <p>Comprobando permisos del navegador...</p> : null}
              {requestingLocation ? <p>Buscando tu ubicación aproximada...</p> : null}
              {!checkingPermission && !requestingLocation && feedback ? <p>{feedback}</p> : null}
            </div>
          </div>

          <div className={styles.controlColumn}>
            <button
              type="button"
              className={styles.switch}
              role="switch"
              aria-checked={switchEnabled}
              aria-label="Mostrarme cerca de mi zona"
              onClick={handleToggle}
              disabled={checkingPermission || requestingLocation}
            >
              <span className={styles.switchTrack} data-on={switchEnabled ? 'true' : 'false'}>
                <span className={styles.switchThumb} data-on={switchEnabled ? 'true' : 'false'} />
              </span>
            </button>
          </div>
        </div>

        <span className={`${styles.statusPill} ${styles.statusFooter} ${styles[`status${statusTone}`]}`}>
          {statusLabel}
        </span>
      </article>
    </StepFrame>
  )
}
