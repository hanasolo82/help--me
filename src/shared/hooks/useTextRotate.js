import { useEffect, useState } from 'react'

/**
 * Índice que avanza cíclicamente cada `interval` ms.
 * Con prefers-reduced-motion queda fijo en 0 (sin rotación).
 *
 * @param {number} length Número de elementos a rotar.
 * @param {number} [interval=3200] ms entre cambios.
 * @returns {number} índice actual.
 */
export function useTextRotate(length, interval = 3200) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || length <= 1) return undefined

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % length)
    }, interval)
    return () => clearInterval(id)
  }, [length, interval])

  return index
}
