import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import styles from './ThemeSwitch.module.css'

const TRANSITION_DURATION = 500

export default function ThemeSwitch({
  checked = false,
  onCheckedChange,
  className = '',
}) {
  const nextLabel = checked ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  const rootClassName = `${styles.switch} ${checked ? styles.switchChecked : ''} ${className}`.trim()

  function handleClick(event) {
    const next = !checked
    const applyChange = () => onCheckedChange?.(next)

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Fallback: sin View Transitions o con reduced-motion → cambio directo, sin animación.
    if (
      typeof document === 'undefined' ||
      typeof document.startViewTransition !== 'function' ||
      prefersReduced
    ) {
      applyChange()
      return
    }

    // Origen de la revelación: centro del botón.
    const rect = event.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    // Radio hasta la esquina más lejana para cubrir toda la pantalla.
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y),
    )

    const transition = document.startViewTransition(() => {
      // flushSync garantiza que el cambio de data-theme (y el estado de React) se aplique
      // de forma síncrona antes de que el navegador capture la instantánea "nueva".
      flushSync(applyChange)
    })

    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${maxRadius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: TRANSITION_DURATION,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {
        // Si la transición se interrumpe, el tema ya está aplicado; no hace falta nada más.
      })
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={nextLabel}
      className={rootClassName}
      onClick={handleClick}
    >
      <span className={styles.srOnly}>{nextLabel}</span>
      <span className={styles.icon} aria-hidden="true">
        <Moon size={16} strokeWidth={2} />
      </span>
      <span className={styles.icon} aria-hidden="true">
        <Sun size={16} strokeWidth={2} />
      </span>
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  )
}
