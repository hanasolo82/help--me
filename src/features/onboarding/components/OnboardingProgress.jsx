import styles from '../styles/onboarding.module.css'

export default function OnboardingProgress({ steps = [], currentStep = 0 }) {
  return (
    <div className={styles.progress}>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${Math.max(10, ((currentStep + 1) / steps.length) * 100)}%` }} />
      </div>
      <div className={styles.stepper}>
        {steps.map((step, index) => (
          <span key={step.key} className={`${styles.stepChip} ${index === currentStep ? styles.isActive : ''}`.trim()}>
            {index + 1}. {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}

