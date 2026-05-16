import { useState } from 'react'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function SecuritySettings() {
  const { onSignOut } = useSettings()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState('')

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
      eyebrow="Seguridad"
      title="Acceso y cuenta"
      description="Gestión de sesión y preparación para futuras opciones de seguridad."
    >
      <div className={styles.securityGrid}>
        <div className={styles.securityNote}>
          <h3>Cambiar contraseña</h3>
          <p className="muted">Bloque preparado para una futura pantalla de cambio de contraseña.</p>
          <button type="button" className="secondary-action" disabled>
            Próximamente
          </button>
        </div>

        <div className={styles.securityNote}>
          <h3>Cerrar sesión</h3>
          <p className="muted">Termina tu sesión actual en este dispositivo de forma segura.</p>
          {error && <p className="auth-message error">{error}</p>}
          <button type="button" className="danger-action" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
