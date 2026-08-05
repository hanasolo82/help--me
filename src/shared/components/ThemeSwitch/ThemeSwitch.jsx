import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import styles from './ThemeSwitch.module.css'

const MIN_TRANSITION_DURATION = 800
const MAX_TRANSITION_DURATION = 1100

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

    // El origen visual es siempre el centro físico del switch. Usar el punto
    // exacto del toque desplazaba la onda dentro de este control tan pequeño,
    // especialmente en Chrome Android.
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
      Math.max(MIN_TRANSITION_DURATION, maxRadius),
    )

    activeTransitionRef.current?.skipTransition?.()
    const root = document.documentElement
    root.dataset.themeTransition = 'wave'
    root.style.setProperty('--theme-wave-x', `${x}px`)
    root.style.setProperty('--theme-wave-y', `${y}px`)
    root.style.setProperty('--theme-wave-radius', `${maxRadius}px`)
    root.style.setProperty('--theme-wave-duration', `${Math.round(duration)}ms`)

    const transition = document.startViewTransition(() => {
      // flushSync garantiza que el cambio de data-theme (y el estado de React) se aplique
      // de forma síncrona antes de que el navegador capture la instantánea "nueva".
      flushSync(applyChange)
    })
    activeTransitionRef.current = transition

    transition.finished
      .catch(() => {})
      .finally(() => {
        if (activeTransitionRef.current === transition) {
          activeTransitionRef.current = null
          delete root.dataset.themeTransition
          root.style.removeProperty('--theme-wave-x')
          root.style.removeProperty('--theme-wave-y')
          root.style.removeProperty('--theme-wave-radius')
          root.style.removeProperty('--theme-wave-duration')
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
