import StepFrame from './StepFrame'
import UserAvatar from '../../../../shared/ui/UserAvatar'
import styles from './BasicProfileStep.module.css'

function getInitials(fullName = '') {
  return String(fullName)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'HM'
}

export default function BasicProfileStep({ onNext, onBack, journeyDraft, setJourneyDraft, profile, stepStatus = 'pending' }) {
  const firstName = journeyDraft?.firstName || ''
  const lastName = journeyDraft?.lastName || ''
  const about = journeyDraft?.about || ''
  const activityPlace = journeyDraft?.activityPlace || ''
  const displayName = journeyDraft?.fullName || profile?.display_name || profile?.full_name || ''
  const avatarUrl = journeyDraft?.avatarUrl || profile?.avatar_url || ''
  const avatarInitials = getInitials(displayName)
  const statusLabel =
    stepStatus === 'complete' ? 'Completado' : stepStatus === 'review' ? 'Revisar' : 'Pendiente'

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
        <section className={styles.profilePreview} aria-label="Perfil recuperado">
          <UserAvatar
            src={avatarUrl}
            name={displayName || avatarInitials}
            size="lg"
            variant="rounded"
            className={styles.avatarWrap}
            decorative
          />
          <div className={styles.profilePreviewCopy}>
            <div className={styles.profilePreviewHeader}>
              <p className={styles.previewKicker}>Perfil recuperado</p>
              <span className={styles.previewBadge}>{statusLabel}</span>
            </div>
            <strong>{displayName || 'Tu perfil público'}</strong>
            <p className={styles.previewText}>
              Ya hemos recuperado parte de tu información para que el proceso sea más rápido.
            </p>
          </div>
        </section>

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
