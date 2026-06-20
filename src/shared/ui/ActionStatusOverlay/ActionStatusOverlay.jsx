import { useId } from 'react'
import { createPortal } from 'react-dom'
import styles from './ActionStatusOverlay.module.css'

export default function ActionStatusOverlay({
  open,
  title,
  message = 'Espera unos segundos. No cierres esta pantalla.',
}) {
  const titleId = useId()
  const messageId = useId()

  if (!open || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      aria-busy="true"
    >
      <section className={styles.panel} aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <div>
          <strong id={titleId}>{title}</strong>
          <p id={messageId}>{message}</p>
        </div>
      </section>
    </div>,
    document.body,
  )
}
