import { useEffect, useState } from 'react'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Typewriter cíclico: escribe y borra cada palabra del array, una tras otra.
 * Con prefers-reduced-motion muestra la primera palabra completa, sin animar.
 *
 * El bucle es autocontenido (variables locales + timeouts que se encadenan),
 * NO depende de `text`, para que cada retardo (typeSpeed/deleteSpeed/holdFull/
 * holdEmpty) se respete tal cual. setText solo actualiza lo que se muestra.
 *
 * @param {string[]} words
 * @param {object} [opts]
 * @param {number} [opts.typeSpeed=70] ms por carácter al escribir.
 * @param {number} [opts.deleteSpeed=40] ms por carácter al borrar.
 * @param {number} [opts.holdFull=1500] pausa con la palabra completa (antes de borrar).
 * @param {number} [opts.holdEmpty=350] pausa tras borrar (antes de la siguiente palabra).
 * @returns {{ text: string }}
 */
export function useTypewriter(
  words,
  { typeSpeed = 70, deleteSpeed = 40, holdFull = 1500, holdEmpty = 350 } = {},
) {
  // Con reduced-motion (o sin palabras) mostramos la primera completa desde el inicio.
  const staticMode = prefersReducedMotion() || !words.length
  const [text, setText] = useState(() => (staticMode ? words[0] ?? '' : ''))

  useEffect(() => {
    if (staticMode) return undefined

    let timer
    let cancelled = false
    let wordIndex = 0
    let charCount = 0
    let deleting = false

    const schedule = (delay) => {
      timer = setTimeout(() => {
        if (!cancelled) step()
      }, delay)
    }

    const step = () => {
      const word = words[wordIndex]

      if (!deleting) {
        charCount += 1
        setText(word.slice(0, charCount))
        if (charCount === word.length) {
          deleting = true
          schedule(holdFull) // frase completa: se mantiene visible
        } else {
          schedule(typeSpeed)
        }
      } else {
        charCount -= 1
        setText(word.slice(0, charCount))
        if (charCount === 0) {
          deleting = false
          wordIndex = (wordIndex + 1) % words.length
          schedule(holdEmpty) // pausa antes de escribir la siguiente
        } else {
          schedule(deleteSpeed)
        }
      }
    }

    schedule(typeSpeed)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [staticMode, words, typeSpeed, deleteSpeed, holdFull, holdEmpty])

  return { text }
}
