import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

// Reajusta Leaflet cuando su contenedor cambia de tamaño. Necesario desde que el
// workspace de /home ocupa la altura del viewport con flexbox: al redimensionar
// la ventana el mapa cambia de alto y Leaflet debe recalcular su tamaño, o se
// quedan tiles grises / centro descuadrado.
export default function MapAutoResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    let frameId = null

    // Coalescemos varias notificaciones (resize + observer) en un solo
    // invalidateSize por frame.
    const scheduleInvalidate = () => {
      if (frameId !== null) return
      frameId = window.requestAnimationFrame(() => {
        frameId = null
        if (container.isConnected) {
          map.invalidateSize({ animate: false })
        }
      })
    }

    window.addEventListener('resize', scheduleInvalidate)

    let observer = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleInvalidate)
      observer.observe(container)
    }

    return () => {
      window.removeEventListener('resize', scheduleInvalidate)
      observer?.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [map])

  return null
}
