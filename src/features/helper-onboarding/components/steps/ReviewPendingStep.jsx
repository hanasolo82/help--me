import StepFrame from './StepFrame'

export default function ReviewPendingStep({ onFinish, onBack }) {
  return (
    <StepFrame
      kicker="Revisión"
      title="Tu perfil queda en revisión"
      lead="Ya has completado el recorrido y ahora el equipo puede validar tu perfil antes de mostrarlo en el mapa."
      footer={<p className="muted">TODO: este paso puede conectar con una revisión manual o automática cuando exista backend de aprobación.</p>}
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className="primary-action" onClick={onFinish}>
            Finalizar
          </button>
        </>
      }
    />
  )
}
