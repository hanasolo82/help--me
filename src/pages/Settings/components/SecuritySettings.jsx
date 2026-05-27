import { useState } from 'react'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function SecuritySettings() {
  const { onSignOut, user } = useSettings()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at)

  async function handleSignOut() {
    setSigningOut(true)
    setError('')

    try {
      await onSignOut()
    } catch (nextError) {
      setError(nextError?.message || 'No se pudo cerrar la sesión.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <SettingsCard
      id="seguridad"
      eyebrow="Seguridad"
      title="Acceso y cuenta"
      description="Área sensible, clara y sin acciones destructivas accidentales."
    >
      <div className={styles.securityGrid}>
        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Correo principal</span>
          <h3>{user?.email || 'Correo no disponible'}</h3>
          <p className="muted">{emailVerified ? 'Verificado' : 'Pendiente de verificación'}</p>
          <button type="button" className={styles.disabledPill} disabled>
            Modificar correo
          </button>
        </div>

        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Contraseña</span>
          <h3>Cambiar contraseña</h3>
          <p className="muted">Se activará con una comprobación segura antes de guardar cambios.</p>
          <button type="button" className={styles.disabledPill} disabled>
            Preparado
          </button>
        </div>

        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Sesiones</span>
          <h3>Este dispositivo</h3>
          <p className="muted">Activo ahora. La gestión completa de sesiones se añadirá con una capa segura.</p>
          <button type="button" className={styles.disabledPill} disabled>
            Cerrar otras sesiones
          </button>
        </div>

        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Sesión</span>
          <h3>Cerrar sesión</h3>
          <p className="muted">Termina tu sesión actual en este dispositivo de forma segura.</p>
          {error && <p className="auth-message error">{error}</p>}
          <button type="button" className="danger-action" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>

        <div className={`${styles.securityNote} ${styles.dangerNote}`}>
          <span className={styles.panelKicker}>Danger zone</span>
          <h3>Eliminar cuenta permanentemente</h3>
          <p className="muted">
            Esta acción eliminará preferencias, historial asociado y servicios vinculados cuando exista el flujo seguro.
          </p>
          <button type="button" className={styles.disabledPill} disabled>
            Solicitar eliminación
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
