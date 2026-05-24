import { useState } from 'react'
import StepFrame from './StepFrame'
import styles from './IdentityStep.module.css'
import { startStripeConnectOnboarding } from '../../services/stripeConnectService'

export default function IdentityStep({ onNext, onBack, profile }) {
  const [loadingState, setLoadingState] = useState('idle')
  const [error, setError] = useState('')
  const stripeCompleted = Boolean(profile?.stripe_onboarding_completed)

  async function handleStartStripe() {
    setLoadingState('loading')
    setError('')

    try {
      await startStripeConnectOnboarding()
    } catch (nextError) {
      setError(nextError?.message || 'No pudimos abrir Stripe en este momento.')
      setLoadingState('error')
    }
  }

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
          <button
            type="button"
            className="secondary-action"
            onClick={stripeCompleted ? onNext : handleStartStripe}
            disabled={loadingState === 'loading'}
          >
            {stripeCompleted ? 'Continuar' : 'Continuar con Stripe'}
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
          <span className={styles.badge}>{stripeCompleted ? 'Stripe conectado correctamente' : '3 puntos clave'}</span>
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

      <section className={styles.stripeCard} aria-label="Stripe Connect">
        <div className={styles.stripeHeader}>
          <div>
            <p className={styles.stripeKicker}>Verificación con Stripe</p>
            <h3 className={styles.stripeTitle}>Preparación segura para ayudar</h3>
          </div>
          <span className={styles.stripeBadge}>{stripeCompleted ? 'Completado' : 'Stripe Connect'}</span>
        </div>

        <p className={styles.stripeText}>
          Stripe gestionará de forma segura la información necesaria para preparar tu perfil como ayudante. HelpMe no
          almacena documentos ni datos bancarios sensibles.
        </p>

        <div className={styles.stripeActions}>
          <button
            type="button"
            className={styles.stripePrimary}
            onClick={stripeCompleted ? onNext : handleStartStripe}
            disabled={loadingState === 'loading'}
          >
            {loadingState === 'loading'
              ? 'Preparando verificación...'
              : stripeCompleted
                ? 'Continuar'
                : 'Continuar con Stripe'}
          </button>
        </div>

        {error ? (
          <p className={styles.inlineError} role="alert">
            {error}
          </p>
        ) : null}
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
