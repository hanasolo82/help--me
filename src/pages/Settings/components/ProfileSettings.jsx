import { useState } from 'react'
import { sanitizeText } from '../../../lib/security'
import { getAvatarInitial } from '../../../utils/avatar'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import ImageUploadField from './ImageUploadField'

const CERTIFICATE_ACCEPT =
  'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text'
const CERTIFICATE_ERROR = 'Solo puedes subir documentos PDF, DOC, DOCX u ODT.'
const ALLOWED_CERTIFICATE_EXTENSIONS = new Set(['PDF', 'DOC', 'DOCX', 'ODT'])
const ALLOWED_CERTIFICATE_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
])

function isHelperProfileCompleted(profile) {
  return profile?.helper_status === 'active'
}

function buildSkillDraft(profile) {
  const skills = Array.isArray(profile?.skills) ? profile.skills : []

  return skills.map((entry, index) => ({
    id: entry?.skill?.id || entry?.id || entry?.skill_id || `skill-${index}`,
    name: entry?.skill?.name || entry?.name || 'Habilidad',
  }))
}

function getFileExtension(fileName) {
  const nameParts = String(fileName || '').split('.')
  if (nameParts.length < 2) return 'FILE'

  return nameParts.pop().toUpperCase()
}

function buildCertificateDraft(file) {
  const extension = getFileExtension(file.name)

  return {
    id: `${file.name}-${file.lastModified}`,
    name: file.name,
    extension,
    kind: extension === 'PDF' ? 'pdf' : 'document',
  }
}

function isAllowedCertificate(file) {
  const extension = getFileExtension(file?.name)
  if (file?.type?.startsWith('image/')) return false

  return (
    ALLOWED_CERTIFICATE_EXTENSIONS.has(extension) &&
    (!file?.type || file.type === 'application/octet-stream' || ALLOWED_CERTIFICATE_TYPES.has(file.type))
  )
}

export default function ProfileSettings() {
  const { form, profile, setField, avatarPreview } = useSettings()
  const fallbackInitial = getAvatarInitial(form.displayName || profile?.display_name || profile?.full_name)
  const helperCompleted = isHelperProfileCompleted(profile)
  const [helperSkills, setHelperSkills] = useState(() => buildSkillDraft(profile))
  const [skillName, setSkillName] = useState('')
  const [certificates, setCertificates] = useState([])
  const [certificateError, setCertificateError] = useState('')

  function addSkill() {
    const nextName = sanitizeText(skillName, 60)
    if (!nextName) return

    setHelperSkills((current) => [
      ...current,
      { id: `local-${Date.now()}`, name: nextName },
    ])
    setSkillName('')
  }

  function removeSkill(skillId) {
    setHelperSkills((current) => current.filter((skill) => skill.id !== skillId))
  }

  function addCertificates(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length) return
    const acceptedFiles = files.filter(isAllowedCertificate)
    const rejectedFiles = files.length - acceptedFiles.length

    setCertificateError(rejectedFiles > 0 ? CERTIFICATE_ERROR : '')
    if (!acceptedFiles.length) return

    setCertificates((current) => [
      ...current,
      ...acceptedFiles.map((file) => buildCertificateDraft(file)),
    ])
  }

  function removeCertificate(certificateId) {
    setCertificates((current) => current.filter((certificate) => certificate.id !== certificateId))
  }

  return (
    <SettingsCard
      id="perfil"
      eyebrow="Perfil"
      title="Perfil"
      description="Controla cómo te ven otras personas en HelpMe."
    >
      <div className={styles.profileLayout}>
        <div className={styles.profileForm}>
          <ImageUploadField
            label="Foto de perfil"
            helperText="Sube una imagen para tu foto pública."
            currentUrl={profile?.avatar_url}
            previewUrl={avatarPreview}
            fallbackInitial={fallbackInitial}
            actionLabel="Editar foto"
            statusTone={helperCompleted ? (form.availabilityEnabled ? 'available' : 'unavailable') : null}
            onChange={(file) => setField('avatarFile', file)}
          />

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
        </div>
      </div>

      {helperCompleted ? (
        <details className={styles.helperDetails}>
          <summary className={styles.helperSummary}>
            <div className={styles.helperSummaryText}>
              <span>Perfil ayudante</span>
              <small>Disponibilidad y credenciales</small>
            </div>
            <span className={styles.helperSummaryChevron} aria-hidden="true">
              ▾
            </span>
          </summary>

          <div className={styles.helperDetailsGrid}>
            <div className={`${styles.helperAvailabilityRow} ${styles.spanTwo}`}>
              <div className={styles.helperAvailabilityCopy}>
                <strong>Recibir solicitudes como ayudante</strong>
                <p>Activa tu disponibilidad para aparecer como opción cuando alguien necesite ayuda cercana.</p>
              </div>
              <button
                type="button"
                className={
                  form.availabilityEnabled
                    ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}`
                    : styles.settingsSwitch
                }
                onClick={() => setField('availabilityEnabled', !form.availabilityEnabled)}
                role="switch"
                aria-checked={form.availabilityEnabled}
                aria-label="Recibir solicitudes como ayudante"
              >
                <span className={styles.settingsSwitchThumb} aria-hidden="true" />
              </button>
            </div>

            <div className={`${styles.infoGroup} ${styles.spanTwo}`}>
              <span className={styles.panelKicker}>Habilidades</span>
              <div className={styles.skillEditor}>
                <input
                  value={skillName}
                  onChange={(event) => setSkillName(sanitizeText(event.target.value, 60))}
                  placeholder="Añadir habilidad"
                />
                <button type="button" className={styles.settingsCompactAction} onClick={addSkill}>
                  Añadir
                </button>
              </div>
              <div className={styles.skillPills} aria-label="Habilidades del perfil ayudante">
                {helperSkills.length > 0 ? (
                  helperSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className={styles.skillPillActive}
                      onClick={() => removeSkill(skill.id)}
                    >
                      {skill.name}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))
                ) : (
                  <span className={styles.emptyHint}>Añade las habilidades que quieres mostrar como ayudante.</span>
                )}
              </div>
            </div>

            <div className={`${styles.infoGroup} ${styles.spanTwo}`}>
              <span className={styles.panelKicker}>Certificados</span>
              <div className={styles.certificateActionRow}>
                <label className={styles.settingsCompactAction}>
                  Subir certificado
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept={CERTIFICATE_ACCEPT}
                    multiple
                    onChange={(event) => {
                      addCertificates(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
                <p className={styles.helperText}>Documentos visibles para reforzar tu perfil ayudante.</p>
                {certificateError ? (
                  <p className={styles.inlineError} role="alert">
                    {certificateError}
                  </p>
                ) : null}
              </div>
              <div className={styles.certificateList}>
                {certificates.length > 0 ? (
                  certificates.map((certificate) => (
                    <article key={certificate.id} className={styles.certificateItem}>
                      <div className={styles.certificateThumb}>
                        <div
                          className={
                            certificate.kind === 'pdf'
                              ? `${styles.certificateDocument} ${styles.certificateDocumentPdf}`
                              : styles.certificateDocument
                          }
                        >
                          <span>{certificate.kind === 'pdf' ? 'PDF' : 'DOC'}</span>
                        </div>
                      </div>
                      <div className={styles.certificateMeta}>
                        <strong>{certificate.name}</strong>
                        <span>{certificate.extension}</span>
                      </div>
                      <button type="button" className={styles.settingsCompactAction} onClick={() => removeCertificate(certificate.id)}>
                        Quitar
                      </button>
                    </article>
                  ))
                ) : (
                  <p className={styles.emptyHint}>Todavía no has añadido certificados.</p>
                )}
              </div>
            </div>
          </div>
        </details>
      ) : null}
    </SettingsCard>
  )
}
