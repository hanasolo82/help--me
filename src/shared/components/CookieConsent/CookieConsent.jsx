import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { hasDecidedConsent, readConsent, writeConsent } from '../../../lib/consent'
import styles from './CookieConsent.module.css'

// Banner de consentimiento de cookies con tres opciones (necesarias / aceptar todo / configurar)
// y modal granular. Cumple LSSI + RGPD: rechazar es tan facil como aceptar.
export default function CookieConsent() {
  const [visible, setVisible] = useState(() => !hasDecidedConsent())
  const [configOpen, setConfigOpen] = useState(false)
  const [draft, setDraft] = useState(readConsent())

  function persistAndClose(consent) {
    writeConsent(consent)
    setVisible(false)
    setConfigOpen(false)
  }

  function acceptAll() {
    persistAndClose({ preferences: true, analytics: true })
  }

  function rejectAll() {
    persistAndClose({ preferences: false, analytics: false })
  }

  function openConfig() {
    setDraft(readConsent())
    setConfigOpen(true)
  }

  function saveConfig() {
    persistAndClose({
      preferences: Boolean(draft.preferences),
      analytics: Boolean(draft.analytics),
    })
  }

  function handleBackdrop(event) {
    if (event.target === event.currentTarget) {
      setConfigOpen(false)
    }
  }

  if (!visible && !configOpen) return null

  return createPortal(
    <>
      {visible && !configOpen && (
        <section
          className={styles.banner}
          role="dialog"
          aria-modal="false"
          aria-labelledby="cookies-banner-title"
        >
          <div className={styles.content}>
            <p className={styles.kicker}>Cookies y datos locales</p>
            <h2 id="cookies-banner-title">Tu eliges como te recordamos</h2>
            <p>
              Usamos cookies y almacenamiento local <strong>tecnicamente necesarios</strong> para mantener tu sesion
              y guardar preferencias (idioma, modo visual, ultimo email usado). No usamos cookies de publicidad ni
              perfilado. Puedes revocar el consentimiento en cualquier momento.{' '}
              <Link to="/legal/cookies">Mas informacion</Link>.
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={rejectAll}>
              Solo necesarias
            </button>
            <button type="button" className={styles.secondaryButton} onClick={openConfig}>
              Configurar
            </button>
            <button type="button" className={styles.primaryButton} onClick={acceptAll}>
              Aceptar todo
            </button>
          </div>
        </section>
      )}

      {configOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookies-config-title"
          onMouseDown={handleBackdrop}
        >
          <section className={styles.configModal}>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Cerrar configuracion de cookies"
              onClick={() => setConfigOpen(false)}
            >
              ×
            </button>

            <p className={styles.kicker}>Preferencias</p>
            <h2 id="cookies-config-title">Configurar cookies</h2>
            <p>Activa o desactiva cada categoria. Los datos necesarios no se pueden desactivar.</p>

            <ul className={styles.list}>
              <li>
                <div>
                  <strong>Estrictamente necesarias</strong>
                  <p>
                    Mantener tu sesion (Supabase Auth) y recordar tus preferencias de consentimiento. Sin estas la
                    aplicacion no funciona.
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input type="checkbox" checked readOnly />
                  <span>Siempre activas</span>
                </label>
              </li>

              <li>
                <div>
                  <strong>Preferencias</strong>
                  <p>
                    Recordar opciones como modo oscuro o el ultimo email usado para que el siguiente login sea mas
                    rapido. No se comparten con terceros.
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.preferences)}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, preferences: event.target.checked }))
                    }
                  />
                  <span>{draft.preferences ? 'Activadas' : 'Desactivadas'}</span>
                </label>
              </li>

              <li>
                <div>
                  <strong>Analiticas</strong>
                  <p>
                    Medir uso agregado para mejorar la experiencia. <em>Hoy no usamos ninguna herramienta de
                    analitica</em>; si la anadimos en el futuro este interruptor controlara su carga.
                  </p>
                </div>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.analytics)}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, analytics: event.target.checked }))
                    }
                  />
                  <span>{draft.analytics ? 'Activadas' : 'Desactivadas'}</span>
                </label>
              </li>
            </ul>

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={rejectAll}>
                Rechazar todo
              </button>
              <button type="button" className={styles.primaryButton} onClick={saveConfig}>
                Guardar preferencias
              </button>
            </div>

            <p className={styles.note}>
              Detalle completo en{' '}
              <Link to="/legal/cookies" onClick={() => setConfigOpen(false)}>
                Politica de cookies
              </Link>
              .
            </p>
          </section>
        </div>
      )}
    </>
    ,
    document.body,
  )
}
