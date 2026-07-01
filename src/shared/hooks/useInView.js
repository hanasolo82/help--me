import { useEffect, useRef, useState } from 'react'

/**
 * Observa un elemento y devuelve `true` la primera vez que entra en el viewport.
 * Se dispara una sola vez (no revierte al salir) y deja de observar tras activarse.
 * Pensado para animaciones de entrada por scroll.
 *
 * @param {object} [options]
 * @param {number} [options.threshold=0.2] Proporción visible para activar.
 * @param {string} [options.rootMargin='0px 0px -10% 0px'] Margen del root.
 * @returns {[React.RefObject<HTMLElement>, boolean]} [ref, inView]
 */
export function useInView({ threshold = 0.2, rootMargin = '0px 0px -10% 0px' } = {}) {
  const ref = useRef(null)
  // Sin soporte de IntersectionObserver: muestra el contenido directamente.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )

  useEffect(() => {
    const node = ref.current
    if (!node || inView) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [inView, threshold, rootMargin])

  return [ref, inView]
}
