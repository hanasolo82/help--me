import StepFrame from './StepFrame'
import styles from './ReviewPendingStep.module.css'
import { HELPER_TERMS_VERSION } from '../../utils/helperPermissions'

const NORMS = [
  {
    title: 'Ayuda responsable',
    text: 'Acepta solo tareas que puedas realizar correctamente y dentro de tus capacidades.',
  },
  {
    title: 'Comunicación clara',
    text: 'Responde con respeto, confirma los detalles importantes y avisa si no puedes continuar.',
  },
  {
    title: 'Compromisos reales',
    text: 'Mantén actualizada tu disponibilidad y cumple los acuerdos aceptados dentro de la app.',
  },
  {
    title: 'Privacidad y confianza',
    text: 'No compartas datos sensibles fuera de HelpMe ni uses la información de otros usuarios para fines ajenos al servicio.',
  },
  {
    title: 'Uso correcto de la plataforma',
    text: 'No publiques información falsa, no intentes saltarte el funcionamiento de la app y respeta las decisiones de moderación.',
  },
]

function updateJourneyDraft(setJourneyDraft, patch) {
  if (typeof setJourneyDraft !== 'function') return

  setJourneyDraft((current) => ({
    ...current,
    ...patch,
  }))
}

function LegalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

export default function TermsStep({
  onNext,
  onBack,
  journeyDraft,
  setJourneyDraft,
  savingState = 'idle',
  error = '',
}) {
  const accepted = Boolean(journeyDraft?.termsAccepted)
  const isSaving = savingState === 'saving'

  function toggleAccepted() {
    updateJourneyDraft(setJourneyDraft, {
      termsAccepted: !accepted,
      termsVersion: !accepted ? HELPER_TERMS_VERSION : null,
    })
  }

  async function handleActivate() {
    if (!accepted || isSaving) return
    await onNext?.()
  }

  return (
    <StepFrame
      kicker="Normas"
      title="Activa tu perfil de ayudante"
      lead="Ya está todo listo. Antes de aparecer en el mapa, necesitamos que aceptes las normas básicas que mantienen HelpMe claro, responsable y útil para todos."
      footer={
        <p className={styles.footerNote}>
          Al activar tu perfil, podrás aparecer en el mapa y recibir solicitudes compatibles.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack} disabled={isSaving}>
            Atrás
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleActivate}
            disabled={!accepted || isSaving}
          >
            {isSaving ? 'Activando...' : 'Activar perfil'}
          </button>
        </>
      }
    >
      <section className={styles.shell} aria-label="Normas de funcionamiento">
        <div className={styles.panel}>
          <div className={styles.header}>
            <p className={styles.kicker}>Antes de salir al mapa</p>
            <h3 className={styles.heading}>Normas de HelpMe</h3>
            <p className={styles.copy}>
              Son normas simples para cuidar la confianza, la seguridad y la experiencia de la comunidad.
            </p>
          </div>

          <ol className={styles.rules} aria-label="Normas de la comunidad">
            {NORMS.map((norm, index) => (
              <li key={norm.title} className={styles.ruleCard}>
                <span className={styles.ruleNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <div className={styles.ruleContent}>
                  <h4 className={styles.ruleTitle}>{norm.title}</h4>
                  <p className={styles.ruleText}>{norm.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <section className={styles.platformCard} aria-label="HelpMe como plataforma">
            <p className={styles.platformKicker}>HelpMe como plataforma</p>
            <h4 className={styles.platformTitle}>Conexión entre usuarios, no prestación directa del servicio</h4>
            <p className={styles.platformText}>
              HelpMe facilita la conexión entre personas que necesitan ayuda y helpers independientes. Los servicios
              los realizan los usuarios que aceptan cada tarea, no HelpMe directamente.
            </p>
            <p className={styles.platformTextSecondary}>
              Cada helper es responsable de aceptar solo tareas que pueda realizar correctamente y de cumplir los
              acuerdos alcanzados dentro de la app.
            </p>
          </section>

          <label className={styles.checkboxCard}>
            <input
              type="checkbox"
              checked={accepted}
              onChange={toggleAccepted}
              disabled={isSaving}
              className={styles.checkbox}
            />
            <div className={styles.checkboxCopy}>
              <strong className={styles.checkboxTitle}>
                He leído y acepto las{' '}
                <LegalLink href="/legal/community-guidelines">Normas de la comunidad</LegalLink>, los{' '}
                <LegalLink href="/legal/terms">Términos de uso</LegalLink> y la{' '}
                <LegalLink href="/legal/privacy">Política de privacidad</LegalLink> de HelpMe.
              </strong>
              <span className={styles.checkboxNote}>
                Incluye las condiciones de intermediación, uso responsable y limitación razonable de responsabilidad.
                Versión: {HELPER_TERMS_VERSION}
              </span>
            </div>
          </label>

          <div className={styles.metaRow} aria-label="Estado de activación">
            <span className={styles.metaPill}>Perfil listo para publicarse</span>
            <span className={styles.metaPill}>Acceso inmediato al mapa</span>
          </div>
        </div>

        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
      </section>
    </StepFrame>
  )
}
