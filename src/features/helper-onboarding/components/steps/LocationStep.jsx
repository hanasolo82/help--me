import StepFrame from './StepFrame'

export default function LocationStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Ubicación"
      title="Activa tu zona para que te descubran cerca"
      lead="La ubicación alimenta el mapa y el radio de visibilidad."
      footer={<p className="muted">TODO: esta pantalla podrá pedir geolocalización y persistir coordenadas en Supabase.</p>}
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
