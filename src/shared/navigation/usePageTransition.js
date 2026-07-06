import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Navegación con transición de página (View Transitions API vía react-router).
 *
 *   const transitionNavigate = useTransitionNavigate()
 *   transitionNavigate(`/task/${id}`)                       // avanza (entra desde abajo)
 *   transitionNavigate('/home', { direction: 'back' })      // vuelve (entra desde arriba)
 *
 * La dirección se publica como data-attribute en <html> y la lee
 * src/styles/view-transitions.css. En navegadores sin soporte, react-router
 * degrada solo a navegación normal. prefers-reduced-motion desactiva las
 * animaciones en CSS.
 */
export function useTransitionNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (to, { direction = 'forward', ...options } = {}) => {
      document.documentElement.dataset.pageDirection = direction
      navigate(to, { viewTransition: true, ...options })
    },
    [navigate],
  )
}
