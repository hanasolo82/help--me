import { sanitizeText } from '../../../lib/security'
import { getAvatarInitial } from '../../../utils/avatar'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import ImageUploadField from './ImageUploadField'
import PublicProfilePreview from './PublicProfilePreview'

export default function ProfileSettings() {
  const { form, profile, setField, avatarPreview } = useSettings()
  const fallbackInitial = getAvatarInitial(form.displayName || profile?.display_name || profile?.full_name || profile?.username)

  return (
    <SettingsCard
      id="datos-personales"
      eyebrow="Perfil"
      title="Perfil público"
      description="Controla cómo te ven otras personas en HelpMe."
    >
      <div className={styles.profileLayout}>
        <div className={styles.profileForm}>
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
            <span>Presentación</span>
            <textarea
              value={form.bio}
              onChange={(event) => setField('bio', sanitizeText(event.target.value, 160))}
              placeholder="Preséntate brevemente. Puedes contar quién eres o cómo prefieres conectar con la comunidad."
              maxLength={160}
            />
            <p className={styles.helperText}>
              Cuéntales un poco sobre ti para generar confianza y facilitar una mejor conexión.
            </p>
          </label>

          <ImageUploadField
            label="Foto de perfil"
            helperText="Sube una imagen para tu foto pública."
            currentUrl={profile?.avatar_url}
            previewUrl={avatarPreview}
            file={form.avatarFile}
            fallbackInitial={fallbackInitial}
            onChange={(file) => setField('avatarFile', file)}
          />
        </div>

        <PublicProfilePreview />
      </div>
    </SettingsCard>
  )
}
