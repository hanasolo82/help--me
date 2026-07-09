import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './Modal.module.css'

const ModalContext = createContext(null)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SIZE_CLASS = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
}

/**
 * Modal base accesible de la app. Comportamiento (una sola vez, para todos):
 * portal, scroll lock, cierre con Esc y click en el fondo, focus trap, foco
 * inicial dentro, restauración del foco al cerrar y animación entrada/salida
 * (con variante bottom-sheet en móvil y soporte de prefers-reduced-motion).
 *
 * Etiquetado: usa <ModalHeader title="…"> (recomendado) o pasa `ariaLabel`.
 *
 *   <Modal open={open} onClose={close} size="md">
 *     <ModalHeader eyebrow="Solicitud" title="Título" />
 *     <ModalBody>…</ModalBody>
 *     <ModalActions>…</ModalActions>
 *   </Modal>
 *
 * El foco inicial va al primer elemento con [data-autofocus], o al panel.
 */
export default function Modal({
  open,
  onClose,
  size = 'lg',
  ariaLabel,
  labelledBy,
  describedBy,
  className = '',
  // Cierre al pulsar el fondo. true por defecto (comportamiento histórico);
  // ponerlo a false evita cierres accidentales (p. ej. formularios con datos).
  // Solo afecta al backdrop: Escape sigue llamando onClose para que quien lo use
  // pueda decidir su propia lógica (confirmar descarte, etc.).
  closeOnBackdrop = true,
  children,
}) {
  const titleId = useId()
  const panelRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  // 'closed' | 'open' | 'closing' — mantiene el modal montado durante la animación
  // de salida. Ajuste de estado durante el render (patrón recomendado por React
  // para estados derivados de props, sin efecto ni render extra visible).
  const [state, setState] = useState(open ? 'open' : 'closed')
  if (open && state !== 'open') {
    setState('open')
  } else if (!open && state === 'open') {
    setState('closing')
  }

  const mounted = state !== 'closed'

  // Scroll lock + Esc + foco inicial/restauración, solo mientras está abierto.
  useEffect(() => {
    if (state !== 'open') return

    previouslyFocusedRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const autofocus = panel?.querySelector('[data-autofocus]')
    ;(autofocus ?? panel)?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
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
  }, [state, onClose])

  // Cinturón de seguridad: si el animationend de salida no llega (p. ej. la pestaña
  // está en segundo plano), desmonta igualmente pasado un margen.
  useEffect(() => {
    if (state !== 'closing') return
    const timer = window.setTimeout(() => setState('closed'), 600)
    return () => window.clearTimeout(timer)
  }, [state])

  if (!mounted) return null

  function handleBackdropMouseDown(event) {
    if (!closeOnBackdrop) return
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  // Focus trap: Tab circula solo dentro del panel.
  function handlePanelKeyDown(event) {
    if (event.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll(FOCUSABLE)
    if (!focusables?.length) {
      event.preventDefault()
      return
    }
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleAnimationEnd(event) {
    if (state === 'closing' && event.target === panelRef.current) {
      setState('closed')
    }
  }

  return createPortal(
    <div
      className={styles.overlay}
      data-state={state}
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
      onAnimationEnd={handleAnimationEnd}
    >
      <div
        ref={panelRef}
        className={[styles.panel, SIZE_CLASS[size] ?? SIZE_CLASS.lg, className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : (labelledBy ?? titleId)}
        aria-describedby={describedBy}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
      >
        <ModalContext.Provider value={{ onClose, titleId }}>{children}</ModalContext.Provider>
      </div>
    </div>,
    document.body,
  )
}

/** Cabecera estándar: eyebrow opcional + título (etiqueta el dialog) + botón cerrar. */
export function ModalHeader({ eyebrow, title, closeLabel = 'Cerrar', children }) {
  const context = useContext(ModalContext)
  return (
    <div className={styles.header}>
      <div className={styles.headerText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        {title ? (
          <h2 className={styles.title} id={context?.titleId}>
            {title}
          </h2>
        ) : null}
        {children}
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={() => context?.onClose?.()}
        aria-label={closeLabel}
      >
        ×
      </button>
    </div>
  )
}

export function ModalBody({ className = '', children }) {
  return <div className={[styles.body, className].filter(Boolean).join(' ')}>{children}</div>
}

export function ModalActions({ className = '', children }) {
  return <div className={[styles.actions, className].filter(Boolean).join(' ')}>{children}</div>
}
