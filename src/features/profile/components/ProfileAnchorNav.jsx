import styles from '../styles/profilePublicView.module.css'

function scrollToSection(id) {
  const target = document.getElementById(id)
  if (!target) return

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' })
  window.history.replaceState(window.history.state, '', `#${id}`)
}

// Índice de anclas del perfil single-page: navegación secundaria que hace
// scroll suave al bloque. Nunca oculta contenido (sustituye al antiguo
// stepper "Sección X de N" con Anterior/Siguiente).
export default function ProfileAnchorNav({ sections = [] }) {
  if (!sections.length) return null

  return (
    <nav className={styles.anchorNav} aria-label="Secciones del perfil">
      {sections.map((section) => (
        <a
          key={section.id}
          className={styles.anchorLink}
          href={`#${section.id}`}
          onClick={(event) => {
            event.preventDefault()
            scrollToSection(section.id)
          }}
        >
          {section.label}
        </a>
      ))}
    </nav>
  )
}
