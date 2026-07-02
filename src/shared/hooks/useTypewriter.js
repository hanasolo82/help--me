import { useEffect, useRef, useState } from 'react'

/**
 * Typewriter cíclico: escribe y borra cada palabra del array, una tras otra.
 * Con prefers-reduced-motion muestra la primera palabra completa, sin animar.
 *
 * @param {string[]} words
 * @param {object} [opts]
 * @param {number} [opts.typeSpeed=70] ms por carácter al escribir.
 * @param {number} [opts.deleteSpeed=40] ms por carácter al borrar.
 * @param {number} [opts.holdFull=1500] pausa con la palabra completa.
 * @param {number} [opts.holdEmpty=350] pausa antes de la siguiente palabra.
 * @returns {{ text: string }}
 */
function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useTypewriter(
  words,
  { typeSpeed = 70, deleteSpeed = 40, holdFull = 1500, holdEmpty = 350 } = {},
) {
  // Con reduced-motion (o sin palabras) mostramos la primera completa desde el inicio.
  const staticMode = prefersReducedMotion() || !words.length
  const [text, setText] = useState(() => (staticMode ? words[0] ?? '' : ''))
  const state = useRef({ i: 0, deleting: false })

  useEffect(() => {
    if (staticMode) return undefined

    let timer
    const tick = () => {
      const s = state.current
      const word = words[s.i]

      if (!s.deleting) {
        const next = word.slice(0, text.length + 1)
        setText(next)
        if (next === word) {
          s.deleting = true
          timer = setTimeout(tick, holdFull)
          return
        }
        timer = setTimeout(tick, typeSpeed)
      } else {
        const next = word.slice(0, text.length - 1)
        setText(next)
        if (next === '') {
          s.deleting = false
          s.i = (s.i + 1) % words.length
          timer = setTimeout(tick, holdEmpty)
          return
        }
        timer = setTimeout(tick, deleteSpeed)
      }
    }

    timer = setTimeout(tick, typeSpeed)
    return () => clearTimeout(timer)
  }, [staticMode, text, words, typeSpeed, deleteSpeed, holdFull, holdEmpty])

  return { text }
}
