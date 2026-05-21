import StepFrame from './StepFrame'
import styles from './BasicProfileStep.module.css'

export default function BasicProfileStep({ onNext, onBack, journeyDraft, setJourneyDraft }) {
  const firstName = journeyDraft?.firstName || ''
  const lastName = journeyDraft?.lastName || ''
  const about = journeyDraft?.about || ''
  const activityPlace = journeyDraft?.activityPlace || ''

  function updateField(field, value) {
    setJourneyDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleContinue() {
    onNext?.()
  }

  return (
    <StepFrame
      kicker="Tu perfil"
      title="Dinos algo sobre ti"
      className={styles.plainFrame}
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button type="button" className="primary-action" onClick={handleContinue}>
            Continuar
          </button>
        </>
      }
    >
      <div className={styles.stack}>
        <div className={styles.nameRow}>
          <label className="field">
            <span>Nombre</span>
            <input
              value={firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              placeholder="Mario"
              autoComplete="given-name"
            />
          </label>

          <label className="field">
            <span>Apellidos</span>
            <input
              value={lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              placeholder="García López"
              autoComplete="family-name"
            />
          </label>
        </div>

        <label className="field">
          <span>Dinos algo sobre ti</span>
          <textarea
            className={styles.textarea}
            value={about}
            onChange={(event) => updateField('about', event.target.value)}
            placeholder="Cuéntanos a qué te dedicas, qué tipo de ayuda puedes ofrecer y cómo prefieres colaborar."
          />
        </label>

        <label className="field">
          <span>Lugar de actividad</span>
          <input
            value={activityPlace}
            onChange={(event) => updateField('activityPlace', event.target.value)}
            placeholder="Delicias, Zaragoza"
            autoComplete="address-level2"
          />
        </label>
      </div>
    </StepFrame>
  )
}
