import { getAvatarInitial } from '../../../../utils/avatar'
import SkillBadge from '../../../skills/components/SkillBadge'
import styles from './NeedHelpMapLayout.module.css'

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) {
    return 'Cerca de ti'
  }

  return `${Number(distanceKm).toFixed(1)} km`
}

function formatRating(helper) {
  const rating = Number(helper?.rating ?? 0)
  const reviews = Number(helper?.reviews_count ?? 0)

  if (!Number.isFinite(rating) || rating <= 0 || reviews <= 0) {
    return 'Sin valoraciones'
  }

  return `${rating.toFixed(1)} · ${reviews} reviews`
}

function formatAvailability(helper) {
  if (helper?.availability_enabled === true) {
    return 'Disponible'
  }

  if (helper?.availability_enabled === false) {
    return 'No disponible'
  }

  return 'Disponibilidad no indicada'
}

function buildSkillList(helper) {
  const skills = (helper?.skills || []).slice(0, 3).map((skill) => ({
    name: skill?.name || skill?.category || 'Ayuda general',
    icon: skill?.icon || '🏷️',
  }))

  if (skills.length === 0) {
    return [{ name: 'Ayuda general', icon: '✨' }]
  }

  return skills
}

export default function HelperCard({ helper, selected = false, onSelect, onOpenProfile, onContact }) {
  const name = helper?.display_name || helper?.full_name || helper?.username || 'Vecino'
  const avatarInitial = getAvatarInitial(name)
  const verified = Boolean(
    helper?.verified ||
      helper?.verified_email ||
      helper?.verified_phone ||
      helper?.verified_identity ||
      helper?.identity_verified,
  )
  const skills = buildSkillList(helper)
  const canContact = helper?.availability_enabled !== false

  return (
    <article
      className={selected ? `${styles.helperCard} ${styles.helperCardSelected}` : styles.helperCard}
      onClick={() => onSelect?.(helper)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(helper)
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={selected}
    >
      <div className={styles.helperCardTop}>
        <div className={styles.helperAvatar}>
          {helper?.avatar_url ? <img src={helper.avatar_url} alt={name} /> : avatarInitial}
        </div>
        <div className={styles.helperCardHeading}>
          <strong>{name}</strong>
          <p>{formatDistance(helper?.distance_km)}</p>
        </div>
      </div>

      <div className={styles.helperCardMeta}>
        <span>{formatRating(helper)}</span>
        {verified && <span className={styles.helperVerified}>Verificado</span>}
        <span>{formatAvailability(helper)}</span>
      </div>

      <p className={styles.helperDescription}>{helper?.bio || 'Ayuda general y trato cercano dentro de la comunidad.'}</p>

      <div className={styles.helperSkills}>
        {skills.map((skill) => (
          <SkillBadge key={skill.name} skill={skill} type="span" />
        ))}
      </div>

      <div className={styles.helperActions}>
        <button
          type="button"
          className="secondary-action"
          onClick={(event) => {
            event.stopPropagation()
            onOpenProfile?.(helper)
          }}
        >
          Ver perfil
        </button>

        {canContact && (
          <button
            type="button"
            className="primary-action"
            onClick={(event) => {
              event.stopPropagation()
              onContact?.(helper)
            }}
          >
            Contactar
          </button>
        )}
      </div>
    </article>
  )
}
