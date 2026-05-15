import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthPanel from '../AuthPanel/AuthPanel'
import styles from './AuthModal.module.css'

// Modal de auth montado sobre la landing. Cierra al pulsar fuera, ESC o el boton de salida.
// Mantiene scroll lock y devuelve foco al elemento que lo abrio.
export default function AuthModal({ open, mode = 'login', onClose }) {
  const navigate = useNavigate()
  const dialogRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  const handleClose = useCallback(() => {
    if (onClose) onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return

    previouslyFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(event) {
      if (event.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      const previous = previouslyFocusedRef.current
      if (previous && typeof previous.focus === 'function') {
        previous.focus()
      }
    }
  }, [open, handleClose])

  if (!open) return null

  // Cierra solo cuando se hace click en el backdrop (no en el contenido del modal).
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  function handleSuccess({ destination }) {
    handleClose()
    navigate(destination, { replace: true })
  }

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={handleBackdropClick}
    >
      <div className={styles.modal} ref={dialogRef}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Cerrar"
        >
          ×
        </button>

        <AuthPanel
          key={mode}
          titleId="auth-modal-title"
          initialMode={mode}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  )
}
