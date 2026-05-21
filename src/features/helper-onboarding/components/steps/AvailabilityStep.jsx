import StepFrame from './StepFrame'

export default function AvailabilityStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Disponibilidad"
      title="Indica cuándo estás disponible para ayudar"
      lead="La disponibilidad define si apareces o no en el tablón de helpers."
      footer={<p className="muted">TODO: conectar este panel al calendario simple ya existente en onboarding.</p>}
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
