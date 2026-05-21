import StepFrame from './StepFrame'

export default function TermsStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Condiciones"
      title="Confirma que entiendes el funcionamiento de helpers"
      lead="Queremos una base clara antes de activar la visibilidad pública."
      footer={<p className="muted">TODO: conectar aceptación explícita de términos si el backend lo requiere.</p>}
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className="primary-action" onClick={onNext}>
            Continuar
          </button>
        </>
      }
    />
  )
}
