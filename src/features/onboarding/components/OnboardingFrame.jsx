import styles from '../styles/onboarding.module.css'

export default function OnboardingFrame({ title, lead, children, footer }) {
  return (
    <section className={styles.card}>
      <div className={styles.hero}>
        <p className="eyebrow">Onboarding</p>
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
      </div>
      {children}
      {footer ? <div>{footer}</div> : null}
    </section>
  )
}

