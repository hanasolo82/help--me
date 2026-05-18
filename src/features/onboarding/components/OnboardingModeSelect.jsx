import styles from '../styles/onboarding.module.css'

export default function OnboardingModeSelect({ value, onChange }) {
  return (
    <div className={styles.radioGrid}>
      <button
        type="button"
        className={`${styles.radioOption} ${value === 'need' ? styles.isSelected : ''}`.trim()}
        onClick={() => onChange('need')}
      >
        <strong>Necesito ayuda</strong>
        <span className="muted">Quiero encontrar a alguien cercano que me resuelva tareas.</span>
      </button>
      <button
        type="button"
        className={`${styles.radioOption} ${value === 'help' ? styles.isSelected : ''}`.trim()}
        onClick={() => onChange('help')}
      >
        <strong>Quiero ayudar</strong>
        <span className="muted">Quiero ofrecer mis skills y empezar a construir reputación.</span>
      </button>
    </div>
  )
}

