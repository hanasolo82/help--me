import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import styles from './ThemeSwitch.module.css'

const MIN_TRANSITION_DURATION = 520
const MAX_TRANSITION_DURATION = 720

export default function ThemeSwitch({
  checked = false,
  onCheckedChange,
  className = '',
}) {
  const activeTransitionRef = useRef(null)
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
    // La pseudo-capa de View Transitions usa el snapshot containing block, que
    // puede ser mayor que visualViewport en móviles con barras dinámicas.
    const viewportWidth = Math.max(window.innerWidth, document.documentElement.clientWidth)
    const viewportHeight = Math.max(window.innerHeight, document.documentElement.clientHeight)
    const maxRadius =
      Math.hypot(
        Math.max(x, viewportWidth - x),
        Math.max(y, viewportHeight - y),
      ) + 2
    const duration = Math.min(
      MAX_TRANSITION_DURATION,
      Math.max(MIN_TRANSITION_DURATION, maxRadius * 0.72),
    )

    activeTransitionRef.current?.skipTransition?.()
    document.documentElement.dataset.themeTransition = 'wave'

    const transition = document.startViewTransition(() => {
      // flushSync garantiza que el cambio de data-theme (y el estado de React) se aplique
      // de forma síncrona antes de que el navegador capture la instantánea "nueva".
      flushSync(applyChange)
    })
    activeTransitionRef.current = transition

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
            duration,
            easing: 'cubic-bezier(0.4, 0, 1, 1)',
            pseudoElement: '::view-transition-new(root)',
          },
        )
      })
      .catch(() => {
        // Si la transición se interrumpe, el tema ya está aplicado; no hace falta nada más.
      })

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransitionRef.current === transition) {
          activeTransitionRef.current = null
          delete document.documentElement.dataset.themeTransition
        }
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
      <span className={`${styles.icon} ${styles.iconSun}`} aria-hidden="true">
        <Sun size={16} strokeWidth={2} />
      </span>
      <span className={`${styles.icon} ${styles.iconMoon}`} aria-hidden="true">
        <Moon size={16} strokeWidth={2} />
      </span>
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  )
}
