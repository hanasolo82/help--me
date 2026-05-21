import styles from '../styles/onboarding.module.css'

export default function OnboardingProgress({ steps = [], currentStep = 0 }) {
  return (
    <div className={styles.progress}>
      <div className={styles.progressTrack} aria-hidden="true">
        <span className={styles.progressFill} style={{ width: `${Math.max(10, ((currentStep + 1) / steps.length) * 100)}%` }} />
      </div>
    </div>
  )
}
