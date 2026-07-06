import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import AuthPanel from '../AuthPanel/AuthPanel'
import styles from './AuthModal.module.css'

// Modal de auth montado sobre la landing. Cierra al pulsar fuera, ESC o el boton de salida.
// Mantiene scroll lock y devuelve foco al elemento que lo abrio.
export default function AuthModal({ open, mode = 'login', onClose, onSuccess }) {
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
    dialogRef.current?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        handleClose()
        return
      }

      // Focus trap: Tab circula solo dentro del modal.
      if (event.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement
        if (event.shiftKey && (active === first || active === dialogRef.current)) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
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

  function handleSuccess(payload) {
    handleClose()
    if (onSuccess) {
      onSuccess(payload)
      return
    }

    navigate(payload.destination, { replace: true })
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onMouseDown={handleBackdropClick}
    >
      <div className={styles.modal} ref={dialogRef} tabIndex={-1}>
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
    </div>,
    document.body,
  )
}
