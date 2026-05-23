import StepFrame from './StepFrame'
import styles from './WelcomeStep.module.css'

export default function WelcomeStep({ onNext }) {
  return (
    <StepFrame
      kicker="Modo ayudante"
      title="Empieza a ayudar cerca de ti"
      lead="Crea un perfil claro y confiable para que las personas puedan encontrarte, conocer tus habilidades y proponerte tareas."
      className={styles.welcomeFrame}
      actions={
        <button type="button" className={styles.primaryCta} onClick={onNext}>
          Crear mi perfil de ayudante
        </button>
      }
      footer={
        <p className={styles.footerNote}>Podrás continuar más tarde sin perder tu progreso.</p>
      }
    >
      <div className={styles.heroTrust}>
        <p className={styles.trustLabel}>Confianza y control</p>
        <p className={styles.trustText}>
          Tu perfil no aparecerá públicamente hasta completar los pasos necesarios.
        </p>
      </div>

      <div className={styles.layout}>
        <section className={styles.processCard} aria-label="Resumen de pasos del onboarding">
          <div className={styles.processHeader}>
            <div>
              <p className={styles.processKicker}>Tu recorrido</p>
              <h3 className={styles.processTitle}>5 pasos para crear un perfil sólido</h3>
            </div>
            <span className={styles.processBadge}>5 pasos</span>
          </div>

          <ol className={styles.stepsList}>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>1</span>
              <div>
                <h4>Tu perfil</h4>
                <p>Añade una presentación clara para que las personas sepan quién eres.</p>
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>2</span>
              <div>
                <h4>Dónde puedes ayudar</h4>
                <p>Activa tu zona para aparecer en búsquedas cercanas.</p>
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>3</span>
              <div>
                <h4>Habilidades</h4>
                <p>Selecciona los servicios que puedes ofrecer.</p>
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>4</span>
              <div>
                <h4>Disponibilidad</h4>
                <p>Marca los días en los que sueles estar disponible.</p>
              </div>
            </li>
            <li className={styles.stepItem}>
              <span className={styles.stepNumber}>5</span>
              <div>
                <h4>Confianza</h4>
                <p>Añade información de contacto y completa los últimos pasos de seguridad.</p>
              </div>
            </li>
          </ol>
        </section>

        <aside className={styles.trustCard} aria-label="Privacidad y control">
          <p className={styles.trustCardKicker}>Privacidad y control</p>
          <h3 className={styles.trustCardTitle}>Tú decides qué compartir y cuándo</h3>
          <p className={styles.trustCardLead}>
            Mostraremos solo lo necesario para que tu perfil resulte útil, claro y confiable.
          </p>

          <div className={styles.trustPills} aria-hidden="true">
            <span className={styles.trustPill}>Ubicación aproximada</span>
            <span className={styles.trustPill}>Edición futura</span>
            <span className={styles.trustPill}>Control total</span>
          </div>

          <p className={styles.trustFinePrint}>
            Podrás continuar más tarde sin perder tu progreso.
          </p>
        </aside>
      </div>
    </StepFrame>
  )
}
