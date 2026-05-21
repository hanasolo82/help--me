import StepFrame from './StepFrame'
import styles from './HelperSteps.module.css'

export default function WelcomeStep({ onNext }) {
  return (
    <StepFrame
      kicker="Bienvenida"
      title="Vamos a preparar tu perfil de helper paso a paso"
      lead="Cada paso se guarda automáticamente para que puedas continuar luego sin perder progreso."
      className={styles.plainFrame}
      footer={
        <ul className="muted">
          <li>Perfil básico y foto</li>
          <li>Ubicación y skills</li>
          <li>Disponibilidad, contacto y verificación</li>
        </ul>
      }
      actions={
        <button type="button" className="primary-action" onClick={onNext}>
          Empezar
        </button>
      }
    />
  )
}
