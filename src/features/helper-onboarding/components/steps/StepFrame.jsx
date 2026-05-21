import styles from './HelperSteps.module.css'

export default function StepFrame({
  kicker = 'Helper onboarding',
  title,
  lead,
  children,
  footer,
  actions,
  className = '',
}) {
  return (
    <section className={`${styles.frame} ${className}`.trim()}>
      <header className={styles.header}>
        <p className="eyebrow">{kicker}</p>
        <h2 className={styles.title}>{title}</h2>
        {lead ? <p className={`muted ${styles.lead}`}>{lead}</p> : null}
      </header>

      <div className={styles.body}>{children}</div>

      {footer ? <footer className={styles.note}>{footer}</footer> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </section>
  )
}
