import styles from '../styles/profilePublicView.module.css'

// Stepper controlado: el padre (ProfilePublicLayout) decide qué sección se ve.
// Antes sincronizaba el contador con el scroll (IntersectionObserver) y los
// botones Anterior/Siguiente quedaban desincronizados a mitad de scroll (QA).
export default function ProfileSectionTabs({ sections = [], activeIndex = 0, onNavigate }) {
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
          onClick={() => onNavigate?.(activeIndex - 1)}
          disabled={activeIndex === 0}
        >
          Anterior
        </button>
        <button
          type="button"
          className={styles.sectionStepButton}
          onClick={() => onNavigate?.(activeIndex + 1)}
          disabled={activeIndex === sections.length - 1}
        >
          Siguiente
        </button>
      </div>
    </nav>
  )
}
