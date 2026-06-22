import { useEffect, useMemo, useState } from 'react'
import styles from '../styles/profilePublicView.module.css'

function getCurrentHash() {
  if (typeof window === 'undefined') return ''
  return window.location.hash.replace('#', '')
}

export default function ProfileSectionTabs({ sections = [] }) {
  const initialIndex = useMemo(() => {
    const hashIndex = sections.findIndex((section) => section.id === getCurrentHash())
    return hashIndex >= 0 ? hashIndex : 0
  }, [sections])
  const [activeIndex, setActiveIndex] = useState(initialIndex)

  useEffect(() => {
    const sectionNodes = sections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean)

    if (!sectionNodes.length) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]

        if (!visibleEntry) return

        const nextIndex = sections.findIndex((section) => section.id === visibleEntry.target.id)
        if (nextIndex >= 0) setActiveIndex(nextIndex)
      },
      {
        rootMargin: '-18% 0px -62% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    sectionNodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [sections])

  function goToSection(index) {
    const section = sections[index]
    if (!section) return

    const target = document.getElementById(section.id)
    if (!target) return

    setActiveIndex(index)
    window.history.replaceState(window.history.state, '', `#${section.id}`)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!sections.length) {
    return null
  }

  const activeSection = sections[activeIndex] || sections[0]

  return (
    <nav className={styles.sectionStepper} aria-label="Recorrido por las secciones del perfil">
      <div className={styles.sectionProgress} aria-live="polite">
        <span>
          Sección {activeIndex + 1} de {sections.length}
        </span>
        <strong>{activeSection.label}</strong>
      </div>

      <div className={styles.sectionControls}>
        <button
          type="button"
          className={styles.sectionStepButton}
          onClick={() => goToSection(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          Anterior
        </button>
        <button
          type="button"
          className={styles.sectionStepButton}
          onClick={() => goToSection(activeIndex + 1)}
          disabled={activeIndex === sections.length - 1}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
