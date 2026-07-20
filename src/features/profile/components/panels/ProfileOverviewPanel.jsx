import styles from '../../styles/profilePublicView.module.css'
import ProfileContentSection from '../ProfileContentSection'
import ProfileEditableRow from '../ProfileEditableRow'
import { getProfileName } from '../../utils/profileFormatters'

export default function ProfileOverviewPanel({ profile, isEditing = false, onEditIdentity }) {
  const displayName = getProfileName(profile)

  return (
    <ProfileContentSection
      id="resumen"
      eyebrow="Sobre mí"
      title="Presentación personal"
      lead={`Conoce un poco mejor a ${displayName}.`}
      actionLabel={isEditing ? 'Editar identidad en Ajustes' : null}
      onAction={isEditing ? onEditIdentity : null}
    >
      <div className={styles.sectionRows}>
        <ProfileEditableRow
          label={`Sobre ${displayName}`}
          value={profile?.bio || 'Aún no ha compartido una presentación pública.'}
          meta="Presentación visible para otras personas."
        />
      </div>
    </ProfileContentSection>
  )
}
