import { useEffect } from 'react'

/** Secciones principales de la landing (sin header ni footer). */
export const SCROLL_REVEAL_SECTION_IDS = [
  'inicio',
  'como-funciona',
  'categorias',
  'planes',
  'confianza',
  'empieza',
]

/** Parámetros ajustables del efecto (afinar aquí la intensidad). */
const DEFAULT_OPTIONS = {
  translate: 24, // px de desplazamiento de entrada
  blur: 6, // px de desenfoque de entrada
  exitBlur: 2, // px de desenfoque leve al atenuarse
  minOpacity: 0.45, // opacidad mínima al salir de pantalla
  exitScale: 0.98, // escala al atenuarse
  fullAt: 0.6, // fracción visible a partir de la cual la sección es nítida
}

/**
 * Efecto de scroll centralizado para las secciones de la landing:
 * - ENTRADA: la primera vez que una sección entra por scroll, se anima desde
 *   { opacity:0, translateY, blur } hasta nítida.
 * - SALIDA: al abandonar la pantalla se atenúa de forma sutil y reversible
 *   (opacidad, escala y blur mapeados a la fracción visible).
 *
 * Escribe custom properties (`--sr-*`) y un atributo `data-reveal` en cada
 * <section>; el aspecto se resuelve en CSS (opacity/transform/filter, compositables).
 * No usa listeners de scroll: se apoya en un único IntersectionObserver con
 * varios thresholds y escribe directamente en el DOM (sin re-render de React).
 *
 * @param {React.RefObject<HTMLElement>} containerRef Wrapper de la landing.
 * @param {Partial<typeof DEFAULT_OPTIONS>} [options]
 */
export function useScrollReveal(containerRef, options) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Accesibilidad: con reduced-motion no marcamos nada → secciones a opacidad completa.
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const sections = SCROLL_REVEAL_SECTION_IDS.map((id) =>
      container.querySelector(`#${id}`),
    ).filter(Boolean)

    if (!sections.length) return undefined

    const viewportHeight = () =>
      window.innerHeight || document.documentElement.clientHeight || 1

    sections.forEach((el) => {
      el.style.setProperty('--sr-translate', `${opts.translate}px`)
      el.style.setProperty('--sr-blur', `${opts.blur}px`)
      el.style.setProperty('--sr-exit-blur', `${opts.exitBlur}px`)
      el.style.setProperty('--sr-min-opacity', `${opts.minOpacity}`)
      el.style.setProperty('--sr-exit-scale', `${opts.exitScale}`)

      // Estado inicial: lo ya visible arranca nítido (sin fade-in en carga, p.ej. el hero).
      const rect = el.getBoundingClientRect()
      const vh = viewportHeight()
      const initiallyVisible = rect.top < vh && rect.bottom > 0
      el.dataset.reveal = initiallyVisible ? 'in' : 'pending'
      el.style.setProperty('--sr-progress', initiallyVisible ? '1' : '0')
    })

    const thresholds = Array.from({ length: 21 }, (_, i) => i / 20)

    const observer = new IntersectionObserver(
      (entries) => {
        const vh = viewportHeight()
        entries.forEach((entry) => {
          const el = entry.target

          // Primera entrada por scroll: pending → in (dispara la animación de entrada).
          if (entry.isIntersecting && el.dataset.reveal === 'pending') {
            el.dataset.reveal = 'in'
          }
          if (el.dataset.reveal === 'pending') return

          // Fracción visible robusta también para secciones más altas que el viewport.
          const denom = Math.min(entry.boundingClientRect.height, vh) || 1
          const visibleFraction = entry.intersectionRect.height / denom
          const progress = Math.max(
            0,
            Math.min(1, visibleFraction / opts.fullAt),
          )
          el.style.setProperty('--sr-progress', progress.toFixed(3))
        })
      },
      { threshold: thresholds },
    )

    sections.forEach((el) => observer.observe(el))

    return () => {
      observer.disconnect()
      sections.forEach((el) => {
        delete el.dataset.reveal
        ;[
          '--sr-progress',
          '--sr-translate',
          '--sr-blur',
          '--sr-exit-blur',
          '--sr-min-opacity',
          '--sr-exit-scale',
        ].forEach((prop) => el.style.removeProperty(prop))
      })
    }
  }, [containerRef, options])
}
