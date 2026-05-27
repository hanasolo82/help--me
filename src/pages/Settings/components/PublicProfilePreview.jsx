import { getAvatarInitial } from '../../../utils/avatar'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'

function getDisplayName(form, profile) {
  return form.displayName || profile?.display_name || profile?.full_name || 'Nombre visible'
}

function getPrimarySkill(profile) {
  if (!Array.isArray(profile?.skills) || profile.skills.length === 0) return null

  return profile.skills.find((entry) => entry?.is_primary) || profile.skills[0]
}

function getSkillLabel(skillEntry) {
  return skillEntry?.skill?.name || skillEntry?.name || ''
}

function getSkillRating(skillEntry) {
  const rating = Number(skillEntry?.rating || skillEntry?.skill_rating)

  if (!Number.isFinite(rating) || rating <= 0) return ''

  return `${rating.toFixed(1)}`
}

export default function PublicProfilePreview({ mode = 'public' }) {
  const { form, profile, avatarPreview } = useSettings()
  const displayName = getDisplayName(form, profile)
  const activeUrl = avatarPreview || profile?.avatar_url || ''
  const fallbackInitial = getAvatarInitial(displayName)
  const primarySkill = getPrimarySkill(profile)
  const skillLabel = getSkillLabel(primarySkill)
  const skillRating = getSkillRating(primarySkill)
  const highlightedComment = profile?.highlighted_review || profile?.featured_review || ''
  const isStripeComplete = Boolean(profile?.stripe_onboarding_completed)
  const isHelperPreview = mode === 'helper'
  const isCurrentlyAvailable = profile?.availability_enabled !== false

  return (
    <aside className={styles.publicPreview} aria-label="Vista previa pública">
      <div className={styles.publicPreviewTopline}>
        <span className={styles.publicPreviewLabel}>
          {isHelperPreview ? 'Preview de ayudante' : 'Preview pública'}
        </span>
        {isHelperPreview ? (
          <span className={isCurrentlyAvailable ? styles.statusAvailable : styles.statusUnavailable}>
            {isCurrentlyAvailable ? 'Disponible' : 'No disponible'}
          </span>
        ) : null}
      </div>

      <div className={styles.publicPreviewIdentity}>
        <div className={styles.publicPreviewAvatar}>
          {activeUrl ? <img src={activeUrl} alt={displayName} /> : <span>{fallbackInitial}</span>}
        </div>
        <div>
          <p>
            <strong>{displayName}</strong>
            {isStripeComplete ? <span className={styles.verifiedBadge} aria-label="Verificado">✓</span> : null}
          </p>
          {skillLabel ? (
            <span>{skillLabel}{skillRating ? ` ★${skillRating}` : ''}</span>
          ) : (
            <span>Nuevo en HelpMe</span>
          )}
        </div>
      </div>

      <blockquote>
        {highlightedComment ? `"${highlightedComment}"` : '"Nuevo en HelpMe"'}
      </blockquote>
    </aside>
  )
}
