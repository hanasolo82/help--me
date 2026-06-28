import { useState } from 'react'
import { requestPasswordReset, signOut } from '../../../services/authService'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function SecuritySettings() {
  const { user } = useSettings()
  const [resetState, setResetState] = useState('idle')
  const [signOutState, setSignOutState] = useState('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at)

  async function handlePasswordReset() {
    if (!user?.email) return

    setResetState('loading')
    setMessage('')
    setError('')

    try {
      await requestPasswordReset(user.email)
      setResetState('success')
      setMessage('Te hemos enviado instrucciones para restablecer la contraseña.')
    } catch (nextError) {
      setResetState('error')
      setError(nextError?.message || 'No pudimos enviar el correo de recuperación.')
    }
  }

  async function handleSignOut() {
    setSignOutState('loading')
    setError('')

    try {
      await signOut()
      window.location.replace('/')
    } catch (nextError) {
      setSignOutState('error')
      setError(nextError?.message || 'No se pudo cerrar la sesión.')
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
        </div>

        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Contraseña</span>
          <h3>Restablecer contraseña</h3>
          <p className="muted">Recibirás un enlace de acceso en tu correo principal.</p>
          <button type="button" className="secondary-action" onClick={handlePasswordReset} disabled={!user?.email || resetState === 'loading'}>
            {resetState === 'loading' ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </div>

        <div className={styles.securityNote}>
          <span className={styles.panelKicker}>Sesión</span>
          <h3>Cerrar sesión</h3>
          <p className="muted">Termina la sesión en este dispositivo.</p>
          <button type="button" className="danger-action" onClick={handleSignOut} disabled={signOutState === 'loading'}>
            {signOutState === 'loading' ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </div>

        <div className={`${styles.securityNote} ${styles.dangerNote}`}>
          <span className={styles.panelKicker}>Eliminar cuenta</span>
          <h3>Eliminar cuenta permanentemente</h3>
          <p className="muted">Para continuar, el flujo pedirá escribir DELETE como confirmación.</p>
          <button type="button" className={styles.disabledPill} disabled>
            No disponible desde esta pantalla
          </button>
        </div>

        {message ? <p className={`${styles.securityFeedback} auth-message success`}>{message}</p> : null}
        {error ? <p className={`${styles.securityFeedback} auth-message error`}>{error}</p> : null}
      </div>
    </SettingsCard>
  )
}
