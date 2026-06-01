import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { sanitizeText } from '../../../lib/security'
import { getAvatarInitial } from '../../../utils/avatar'
import {
  getActiveSkills,
  getProfileSkills,
  replaceProfileSkills,
} from '../../../features/helper-onboarding/services/helperSkillsService'
import {
  getProfileAvailability,
  replaceProfileAvailability,
} from '../../../features/helper-onboarding/services/helperAvailabilityService'
import {
  deleteProfileCertificate,
  getProfileCertificates,
  uploadProfileCertificate,
} from '../../../features/helper-onboarding/services/helperCertificatesService'
import { helperOnboardingKeys } from '../../../features/helper-onboarding/utils/helperOnboardingKeys'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'
import ImageUploadField from './ImageUploadField'

const MAX_SETTINGS_SKILLS = 6
const DEFAULT_AVAILABLE_DAYS = [1, 2, 3, 4, 5]
const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mie' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sab' },
  { value: 0, label: 'Dom' },
]
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
const CERTIFICATE_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}

function isHelperProfileCompleted(profile) {
  return profile?.helper_status === 'active'
}

function buildSkillDraft(profileSkills) {
  const skills = Array.isArray(profileSkills) ? profileSkills : []

  return skills.map((entry, index) => ({
    id: entry?.skill?.id || entry?.id || entry?.skill_id || `skill-${index}`,
    name: entry?.skill?.name || entry?.name || 'Habilidad',
  }))
}

function normalizeAvailabilityDays(days = []) {
  const uniqueDays = []

  for (const value of days) {
    const rawDay = typeof value === 'object' && value !== null ? value.day_of_week ?? value.value : value
    const day = Number(rawDay)
    if (!Number.isInteger(day) || day < 0 || day > 6) continue
    if (!uniqueDays.includes(day)) uniqueDays.push(day)
  }

  const visualOrder = [1, 2, 3, 4, 5, 6, 0]
  return uniqueDays.sort((a, b) => visualOrder.indexOf(a) - visualOrder.indexOf(b))
}

function getFileExtension(fileName) {
  const nameParts = String(fileName || '').split('.')
  if (nameParts.length < 2) return 'FILE'

  return nameParts.pop().toUpperCase()
}

function isAllowedCertificate(file) {
  const extension = getFileExtension(file?.name)
  if (file?.type?.startsWith('image/')) return false

  return (
    ALLOWED_CERTIFICATE_EXTENSIONS.has(extension) &&
    (!file?.type || file.type === 'application/octet-stream' || ALLOWED_CERTIFICATE_TYPES.has(file.type))
  )
}

function getCertificateKind(certificate) {
  return getFileExtension(certificate?.file_name) === 'PDF' ? 'pdf' : 'document'
}

function formatCertificateMeta(certificate) {
  const extension = getFileExtension(certificate?.file_name)
  const status = CERTIFICATE_STATUS_LABELS[certificate?.status] || 'Pendiente'

  return `${extension} · ${status}`
}

export default function ProfileSettings() {
  const { form, profile, setField, avatarPreview } = useSettings()
  const queryClient = useQueryClient()
  const profileId = profile?.id
  const fallbackInitial = getAvatarInitial(form.displayName || profile?.display_name || profile?.full_name)
  const helperCompleted = isHelperProfileCompleted(profile)
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [skillError, setSkillError] = useState('')
  const [certificateError, setCertificateError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')

  const skillsCatalogQuery = useQuery({
    queryKey: ['helper-skills', 'active'],
    queryFn: getActiveSkills,
    enabled: helperCompleted && Boolean(profileId),
    staleTime: 5 * 60 * 1000,
  })

  const profileSkillsQuery = useQuery({
    queryKey: helperOnboardingKeys.skills(profileId),
    queryFn: () => getProfileSkills(profileId),
    enabled: helperCompleted && Boolean(profileId),
    staleTime: 60_000,
  })

  const availabilityQuery = useQuery({
    queryKey: helperOnboardingKeys.availability(profileId),
    queryFn: () => getProfileAvailability(profileId),
    enabled: helperCompleted && Boolean(profileId),
    staleTime: 60_000,
  })

  const certificatesQuery = useQuery({
    queryKey: ['profile-certificates', profileId],
    queryFn: () => getProfileCertificates(profileId),
    enabled: helperCompleted && Boolean(profileId),
    staleTime: 60_000,
  })

  const profileSkills = useMemo(
    () => buildSkillDraft(profileSkillsQuery.data ?? profile?.skills),
    [profileSkillsQuery.data, profile?.skills],
  )
  const selectedSkillIds = useMemo(() => profileSkills.map((skill) => skill.id), [profileSkills])
  const selectedSkillIdsSet = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds])
  const skillOptions = useMemo(
    () => (skillsCatalogQuery.data ?? []).filter((skill) => !selectedSkillIdsSet.has(skill.id)),
    [selectedSkillIdsSet, skillsCatalogQuery.data],
  )
  const savedAvailabilityDays = useMemo(
    () => normalizeAvailabilityDays(availabilityQuery.data ?? []),
    [availabilityQuery.data],
  )

  const skillsMutation = useMutation({
    mutationFn: (skillIds) => replaceProfileSkills(profileId, skillIds),
    onSuccess: async () => {
      setSkillError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.skills(profileId) }),
        queryClient.invalidateQueries({ queryKey: ['profile-skills', profileId] }),
      ])
    },
    onError: (error) => {
      setSkillError(error?.message || 'No pudimos guardar tus habilidades ahora mismo.')
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: (days) => replaceProfileAvailability(profileId, days),
    onSuccess: async (_data, days) => {
      const normalizedDays = normalizeAvailabilityDays(days)
      setField('availabilityEnabled', normalizedDays.length > 0)
      setAvailabilityError('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.availability(profileId) }),
        queryClient.invalidateQueries({ queryKey: ['profile-availability', profileId] }),
      ])
    },
    onError: (error) => {
      setAvailabilityError(error?.message || 'No pudimos guardar tu disponibilidad ahora mismo.')
    },
  })

  const certificateUploadMutation = useMutation({
    mutationFn: async (files) => {
      const uploaded = []

      for (const file of files) {
        uploaded.push(await uploadProfileCertificate(profileId, file))
      }

      return uploaded
    },
    onSuccess: async () => {
      setCertificateError('')
      await queryClient.invalidateQueries({ queryKey: ['profile-certificates', profileId] })
    },
    onError: (error) => {
      setCertificateError(error?.message || 'No pudimos subir el certificado ahora mismo.')
    },
  })

  const certificateDeleteMutation = useMutation({
    mutationFn: (certificateId) => deleteProfileCertificate(profileId, certificateId),
    onSuccess: async () => {
      setCertificateError('')
      await queryClient.invalidateQueries({ queryKey: ['profile-certificates', profileId] })
    },
    onError: (error) => {
      setCertificateError(error?.message || 'No pudimos eliminar el certificado ahora mismo.')
    },
  })

  const displayedAvailabilityDays = availabilityMutation.isPending
    ? normalizeAvailabilityDays(availabilityMutation.variables)
    : savedAvailabilityDays
  const displayedAvailabilityEnabled = availabilityMutation.isPending
    ? displayedAvailabilityDays.length > 0
    : form.availabilityEnabled
  const certificates = certificatesQuery.data ?? []

  function addSkill() {
    if (!selectedSkillId || skillsMutation.isPending) return

    if (selectedSkillIds.length >= MAX_SETTINGS_SKILLS) {
      setSkillError('Puedes elegir hasta 6 habilidades.')
      return
    }

    const nextSkillIds = [...selectedSkillIds, selectedSkillId]
    setSelectedSkillId('')
    skillsMutation.mutate(nextSkillIds)
  }

  function removeSkill(skillId) {
    if (skillsMutation.isPending) return
    skillsMutation.mutate(selectedSkillIds.filter((id) => id !== skillId))
  }

  function updateAvailability(nextDays) {
    if (availabilityMutation.isPending) return
    availabilityMutation.mutate(normalizeAvailabilityDays(nextDays))
  }

  function toggleAvailabilityEnabled() {
    if (displayedAvailabilityEnabled) {
      updateAvailability([])
      return
    }

    updateAvailability(displayedAvailabilityDays.length > 0 ? displayedAvailabilityDays : DEFAULT_AVAILABLE_DAYS)
  }

  function toggleAvailabilityDay(day) {
    const nextDays = displayedAvailabilityDays.includes(day)
      ? displayedAvailabilityDays.filter((value) => value !== day)
      : [...displayedAvailabilityDays, day]

    updateAvailability(nextDays)
  }

  function addCertificates(fileList) {
    const files = Array.from(fileList || [])
    if (!files.length || certificateUploadMutation.isPending) return
    const acceptedFiles = files.filter(isAllowedCertificate)
    const rejectedFiles = files.length - acceptedFiles.length

    setCertificateError(rejectedFiles > 0 ? CERTIFICATE_ERROR : '')
    if (!acceptedFiles.length) return

    certificateUploadMutation.mutate(acceptedFiles)
  }

  function removeCertificate(certificateId) {
    if (certificateDeleteMutation.isPending) return
    certificateDeleteMutation.mutate(certificateId)
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
                  displayedAvailabilityEnabled
                    ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}`
                    : styles.settingsSwitch
                }
                onClick={toggleAvailabilityEnabled}
                disabled={availabilityMutation.isPending}
                role="switch"
                aria-checked={displayedAvailabilityEnabled}
                aria-label="Recibir solicitudes como ayudante"
              >
                <span className={styles.settingsSwitchThumb} aria-hidden="true" />
              </button>
            </div>

            <div className={`${styles.infoGroup} ${styles.spanTwo}`}>
              <span className={styles.panelKicker}>Disponibilidad</span>
              <div className={styles.daySelector} aria-label="Días disponibles">
                {WEEKDAY_OPTIONS.map((day) => {
                  const isActive = displayedAvailabilityDays.includes(day.value)

                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={isActive ? `${styles.dayButton} ${styles.dayButtonActive}` : styles.dayButton}
                      onClick={() => toggleAvailabilityDay(day.value)}
                      disabled={availabilityQuery.isPending || availabilityMutation.isPending}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              {availabilityError ? (
                <p className={styles.inlineError} role="alert">
                  {availabilityError}
                </p>
              ) : null}
            </div>

            <div className={`${styles.infoGroup} ${styles.spanTwo}`}>
              <span className={styles.panelKicker}>Habilidades</span>
              <div className={styles.skillEditor}>
                <select
                  value={selectedSkillId}
                  onChange={(event) => setSelectedSkillId(event.target.value)}
                  disabled={skillsCatalogQuery.isPending || skillsMutation.isPending || skillOptions.length === 0}
                >
                  <option value="">
                    {skillsCatalogQuery.isPending ? 'Cargando habilidades...' : 'Selecciona una habilidad'}
                  </option>
                  {skillOptions.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.settingsCompactAction}
                  onClick={addSkill}
                  disabled={!selectedSkillId || skillsMutation.isPending}
                >
                  Añadir
                </button>
              </div>
              {skillError ? (
                <p className={styles.inlineError} role="alert">
                  {skillError}
                </p>
              ) : null}
              <div className={styles.skillPills} aria-label="Habilidades del perfil ayudante">
                {profileSkills.length > 0 ? (
                  profileSkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className={styles.skillPillActive}
                      onClick={() => removeSkill(skill.id)}
                      disabled={skillsMutation.isPending}
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
                  {certificateUploadMutation.isPending ? 'Subiendo...' : 'Subir certificado'}
                  <input
                    className={styles.fileInput}
                    type="file"
                    accept={CERTIFICATE_ACCEPT}
                    multiple
                    disabled={certificateUploadMutation.isPending}
                    onChange={(event) => {
                      addCertificates(event.target.files)
                      event.target.value = ''
                    }}
                  />
                </label>
                <p className={styles.helperText}>Documentos privados asociados a tu perfil ayudante.</p>
                {certificateError ? (
                  <p className={styles.inlineError} role="alert">
                    {certificateError}
                  </p>
                ) : null}
              </div>
              <div className={styles.certificateList}>
                {certificates.length > 0 ? (
                  certificates.map((certificate) => {
                    const kind = getCertificateKind(certificate)

                    return (
                      <article key={certificate.id} className={styles.certificateItem}>
                        <div className={styles.certificateThumb}>
                          <div
                            className={
                              kind === 'pdf'
                                ? `${styles.certificateDocument} ${styles.certificateDocumentPdf}`
                                : styles.certificateDocument
                            }
                          >
                            <span>{kind === 'pdf' ? 'PDF' : 'DOC'}</span>
                          </div>
                        </div>
                        <div className={styles.certificateMeta}>
                          <strong>{certificate.title || certificate.file_name}</strong>
                          <span>{formatCertificateMeta(certificate)}</span>
                        </div>
                        <button
                          type="button"
                          className={styles.settingsCompactAction}
                          onClick={() => removeCertificate(certificate.id)}
                          disabled={certificateDeleteMutation.isPending}
                        >
                          Quitar
                        </button>
                      </article>
                    )
                  })
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
