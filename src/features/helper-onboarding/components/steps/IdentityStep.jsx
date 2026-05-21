import StepFrame from './StepFrame'

export default function IdentityStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Identidad"
      title="Deja lista la verificación de identidad"
      lead="Por ahora dejamos la estructura preparada para revisión manual o automática."
      footer={<p className="muted">TODO: conectar verificación real cuando exista backend de confianza.</p>}
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
