import StepFrame from './StepFrame'

export default function SkillsStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Skills"
      title="Selecciona tus habilidades principales"
      lead="Mostramos un resumen corto para reforzar confianza y matching."
      footer={<p className="muted">TODO: reutilizar el catálogo de skills existente cuando conectemos este wizard.</p>}
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
