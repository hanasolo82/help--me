import StepFrame from './StepFrame'
import styles from './IdentityStep.module.css'

export default function IdentityStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Confianza"
      title="Prepara tu perfil para la revisión"
      lead="Antes de aparecer como ayudante, revisaremos que tu perfil sea claro, coherente y seguro para la comunidad."
      className={styles.identityFrame}
      footer={
        <p className={styles.footer}>
          De momento no necesitas subir documentos. Cuando activemos la verificación real, te guiaremos paso a paso.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className={styles.primaryCta} onClick={onNext}>
            Continuar
          </button>
        </>
      }
    >
      <section className={styles.reviewCard} aria-label="Revisión previa del perfil">
        <div className={styles.reviewHeader}>
          <div>
            <p className={styles.cardKicker}>Revisión previa del perfil</p>
            <h3 className={styles.cardTitle}>Tu perfil, listo para inspirar confianza</h3>
          </div>
          <span className={styles.badge}>3 puntos clave</span>
        </div>

        <p className={styles.cardLead}>
          Queremos que tu presencia como ayudante se sienta clara, útil y segura desde el primer momento.
        </p>

        <ul className={styles.checklist}>
          <li className={styles.checkItem}>
            <span className={styles.checkMark} aria-hidden="true">
              1
            </span>
            <div>
              <strong>Perfil claro</strong>
              <p>Tu presentación ayuda a que las personas entiendan rápidamente quién eres y cómo ayudas.</p>
            </div>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkMark} aria-hidden="true">
              2
            </span>
            <div>
              <strong>Datos coherentes</strong>
              <p>Mantenemos la información ordenada para que tu perfil se vea consistente y fácil de confiar.</p>
            </div>
          </li>
          <li className={styles.checkItem}>
            <span className={styles.checkMark} aria-hidden="true">
              3
            </span>
            <div>
              <strong>Seguridad de la comunidad</strong>
              <p>Revisamos algunos detalles para cuidar una experiencia más segura para todos.</p>
            </div>
          </li>
        </ul>
      </section>

      <aside className={styles.privacyCard} aria-label="Privacidad">
        <p className={styles.privacyKicker}>Privacidad</p>
        <p className={styles.privacyText}>
          No mostraremos información sensible en tu perfil público.
        </p>
      </aside>
    </StepFrame>
  )
}
