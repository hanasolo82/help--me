import { useState } from 'react'
import { requestPasswordReset, signOut } from '../../../services/authService'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../../shared/ui/Modal/Modal'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

// Descripción legible del dispositivo actual a partir del user agent.
function describeCurrentDevice() {
  if (typeof navigator === 'undefined') return 'Este dispositivo'

  const ua = navigator.userAgent
  const browser = /edg\//i.test(ua)
    ? 'Edge'
    : /firefox/i.test(ua)
      ? 'Firefox'
      : /chrome/i.test(ua)
        ? 'Chrome'
        : /safari/i.test(ua)
          ? 'Safari'
          : 'Navegador'
  const os = /windows/i.test(ua)
    ? 'Windows'
    : /mac os/i.test(ua)
      ? 'macOS'
      : /android/i.test(ua)
        ? 'Android'
        : /iphone|ipad|ios/i.test(ua)
          ? 'iOS'
          : /linux/i.test(ua)
            ? 'Linux'
            : ''

  return os ? `${browser} · ${os}` : browser
}

export default function SecuritySettings() {
  const { user } = useSettings()
  const [resetState, setResetState] = useState('idle')
  const [signOutState, setSignOutState] = useState('idle')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteRequested, setDeleteRequested] = useState(false)
  const emailVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at)
  const currentDevice = describeCurrentDevice()
  const sessionSince = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : null

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

  // MAQUETA: la eliminación definitiva no se ejecuta desde aquí todavía.
  // TODO(backend): endpoint de borrado de cuenta (auth + datos + retención legal).
  function handleConfirmDelete() {
    setDeleteModalOpen(false)
    setDeleteConfirmText('')
    setDeleteRequested(true)
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false)
    setDeleteConfirmText('')
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
          <span className={styles.panelKicker}>Verificación en dos pasos</span>
          <h3>
            2FA <span className={styles.comingSoonPill}>Próximamente</span>
          </h3>
          <p className="muted">
            Un código adicional al iniciar sesión. Estamos preparándolo; se activará desde aquí.
          </p>
        </div>

        <div className={`${styles.securityNote} ${styles.spanTwo}`}>
          <span className={styles.panelKicker}>Sesiones activas</span>
          <div className={styles.sessionRow}>
            <div className={styles.sessionCopy}>
              <h3>
                {currentDevice} <span className={styles.sessionCurrentBadge}>Este dispositivo</span>
              </h3>
              <p className="muted">
                {sessionSince ? `Sesión iniciada el ${sessionSince}.` : 'Sesión activa ahora mismo.'}
              </p>
            </div>
            <button type="button" className="danger-action" onClick={handleSignOut} disabled={signOutState === 'loading'}>
              {signOutState === 'loading' ? 'Cerrando...' : 'Cerrar sesión'}
            </button>
          </div>
          {/* TODO(backend): listar el resto de sesiones/dispositivos y permitir
              cerrarlas requiere registrar sesiones en servidor; sin eso solo
              podemos mostrar la sesión actual. */}
          <p className={`muted ${styles.sessionFootnote}`}>
            El historial de otros dispositivos llegará con el próximo backend de seguridad.
          </p>
        </div>

        <div className={`${styles.securityNote} ${styles.dangerNote} ${styles.spanTwo}`}>
          <span className={styles.panelKicker}>Eliminar cuenta</span>
          <h3>Eliminar cuenta permanentemente</h3>
          <p className="muted">
            Borra tu perfil, tus solicitudes y tus conversaciones. Esta acción no se puede deshacer.
          </p>
          {deleteRequested ? (
            <p className={`${styles.securityFeedback} auth-message success`} role="status">
              Hemos registrado tu solicitud. Te escribiremos a {user?.email || 'tu correo'} para confirmar la
              eliminación en las próximas 72 horas.
            </p>
          ) : (
            <button type="button" className="danger-action" onClick={() => setDeleteModalOpen(true)}>
              Quiero eliminar mi cuenta
            </button>
          )}
        </div>

        {message ? <p className={`${styles.securityFeedback} auth-message success`}>{message}</p> : null}
        {error ? <p className={`${styles.securityFeedback} auth-message error`}>{error}</p> : null}
      </div>

      <Modal open={deleteModalOpen} onClose={closeDeleteModal} size="sm">
        <ModalHeader eyebrow="Eliminar cuenta" title="¿Seguro que quieres irte?" />
        <ModalBody>
          <p>
            Se eliminarán tu perfil, tus solicitudes y tus conversaciones. Para confirmar, escribe{' '}
            <strong>ELIMINAR</strong> en el campo.
          </p>
          <input
            className={styles.deleteConfirmInput}
            value={deleteConfirmText}
            onChange={(event) => setDeleteConfirmText(event.target.value)}
            placeholder="ELIMINAR"
            aria-label="Escribe ELIMINAR para confirmar"
            autoComplete="off"
            spellCheck="false"
            data-autofocus
          />
        </ModalBody>
        <ModalActions>
          <button type="button" className="secondary-action" onClick={closeDeleteModal}>
            Conservar mi cuenta
          </button>
          <button
            type="button"
            className="danger-action"
            onClick={handleConfirmDelete}
            disabled={deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR'}
          >
            Solicitar eliminación
          </button>
        </ModalActions>
      </Modal>
    </SettingsCard>
  )
}
