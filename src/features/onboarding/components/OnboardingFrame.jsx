import BackIcon from '../../../assets/icons/back'
import styles from '../styles/onboarding.module.css'

export default function OnboardingFrame({ title, lead, children, footer, onBack }) {
  return (
    <section className={styles.card}>
      {onBack ? (
        <div className={styles.headerRow}>
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="Volver">
            <BackIcon className={styles.backIcon} aria-hidden="true" focusable="false" />
          </button>
        </div>
      ) : null}
      <div className={styles.hero}>
        <p className="eyebrow">helpMe</p>
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
      </div>
      {children}
      {footer ? <div>{footer}</div> : null}
    </section>
  )
}
