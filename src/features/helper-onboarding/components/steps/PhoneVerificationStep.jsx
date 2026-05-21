import StepFrame from './StepFrame'

export default function PhoneVerificationStep({ onNext, onBack }) {
  return (
    <StepFrame
      kicker="Contacto"
      title="Añade un teléfono de contacto cuando estés listo"
      lead="Esto ayuda a reforzar señales de confianza y recuperación de cuenta."
      footer={<p className="muted">TODO: validar SMS o integrar un proveedor real de verificación.</p>}
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
