import { sanitizeText } from '../../../lib/security'
import { getAvatarInitial } from '../../../utils/avatar'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import ImageUploadField from './ImageUploadField'

export default function ProfileSettings() {
  const { form, profile, setField, avatarPreview } = useSettings()
  const fallbackInitial = getAvatarInitial(form.displayName || profile?.display_name || profile?.full_name || profile?.username)

  return (
    <SettingsCard
      eyebrow="Perfil"
      title="Identidad pública"
      description="Define cómo te ven el resto de usuarios en HelpMe."
      accent
    >
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>Nombre visible</span>
          <input
            value={form.displayName}
            onChange={(event) => setField('displayName', sanitizeText(event.target.value, 80))}
            placeholder="Mario García"
            autoComplete="name"
          />
        </label>

        <label className={styles.field}>
          <span>Username</span>
          <input
            value={form.username}
            onChange={(event) => setField('username', sanitizeText(event.target.value, 30).toLowerCase())}
            placeholder="mario_delicias"
            autoComplete="username"
          />
        </label>

        <label className={`${styles.field} ${styles.spanTwo}`}>
          <span>Bio corta</span>
          <textarea
            value={form.bio}
            onChange={(event) => setField('bio', sanitizeText(event.target.value, 160))}
            placeholder="Ayudo con recados y pequeñas gestiones por mi barrio."
            maxLength={160}
          />
        </label>

        <div className={styles.spanTwo}>
          <ImageUploadField
            label="Avatar de perfil"
            helperText="Sube una imagen para tu avatar público."
            currentUrl={profile?.avatar_url}
            previewUrl={avatarPreview}
            file={form.avatarFile}
            fallbackInitial={fallbackInitial}
            onChange={(file) => setField('avatarFile', file)}
          />
        </div>
      </div>
    </SettingsCard>
  )
}
