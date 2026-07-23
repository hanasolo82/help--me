import { ChevronRight, MapPin, MessageSquare, Star } from 'lucide-react'
import UserAvatar from '../../../shared/ui/UserAvatar'
import { CategoryIcon, style as designStyle } from '../../../design'
import { useDirectMessage } from '../../chat/hooks/useDirectMessage'
import {
  canHelperReceiveDirectRequest,
  getDirectRequestCategories,
} from '../../tasks/direct-requests/directRequestCategories'
import FavoriteHeart from './FavoriteHeart'
import styles from './FavoriteProfileCard.module.css'

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

function formatRating(profile) {
  const rating = Number(profile?.rating ?? 0)
  const reviews = Number(profile?.reviews_count ?? 0)

  if (!Number.isFinite(rating) || rating <= 0 || reviews <= 0) {
    return 'Sin opiniones aún'
  }

  return `${rating.toFixed(1)}/5 · ${reviews} ${reviews === 1 ? 'opinión' : 'opiniones'}`
}

export default function FavoriteProfileCard({
  profile,
  isRemoving = false,
  onRemove,
  onRequestHelp,
  onViewProfile,
}) {
  const name = getDisplayName(profile)
  const skills = (profile?.skills ?? []).filter(Boolean)
  const visibleSkills = skills.slice(0, 3)
  const extraSkillCount = Math.max(0, skills.length - visibleSkills.length)
  const directMessage = useDirectMessage(profile?.id)
  const canRequestHelp = profile?.helper_status === 'active'
    && canHelperReceiveDirectRequest(profile)
    && getDirectRequestCategories(profile).length > 0
  const hasDirectAction = canRequestHelp || directMessage.canMessage
  const showUnavailableHint = !hasDirectAction && directMessage.rejectsMessages

  return (
    <article className={`${styles.card} ${isRemoving ? styles.removing : ''}`.trim()}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <UserAvatar
            src={profile?.avatar_url}
            name={name}
            alt={name}
            size="lg"
            variant="circle"
          />
          <div className={styles.nameBlock}>
            <h2>{name}</h2>
            <p className={styles.rating} aria-label={`Valoración: ${formatRating(profile)}`}>
              <Star aria-hidden="true" strokeWidth={2.1} />
              {formatRating(profile)}
            </p>
          </div>
        </div>
        <FavoriteHeart
          helperId={profile?.id}
          isFavorite
          onToggleFavorite={() => onRemove?.(profile)}
          disabled={isRemoving}
          className={styles.favoriteButton}
        />
      </header>

      {profile?.location_label ? (
        <p className={styles.location}>
          <MapPin aria-hidden="true" strokeWidth={2.1} />
          {profile.location_label}
        </p>
      ) : null}

      <p className={styles.bio}>{profile?.bio || 'Perfil de la comunidad HelpMe.'}</p>

      {visibleSkills.length > 0 ? (
        <div className={styles.skills} aria-label="Habilidades">
          {visibleSkills.map((skill) => (
            <span key={skill.id || `${skill.category}-${skill.name}`} className={styles.skill}>
              <CategoryIcon category={skill.category} size={designStyle.iconSize.tag} tone="light" />
              {skill.name}
            </span>
          ))}
          {extraSkillCount > 0 ? <span className={styles.skillMore}>+{extraSkillCount}</span> : null}
        </div>
      ) : null}

      {showUnavailableHint ? (
        <p className={styles.unavailableHint}>No recibe solicitudes directas ahora.</p>
      ) : null}

      <footer className={styles.actions}>
        {canRequestHelp ? (
          <button type="button" className="primary-action" onClick={() => onRequestHelp?.(profile)} disabled={isRemoving}>
            Pedir ayuda
          </button>
        ) : null}
        {directMessage.canMessage ? (
          <button
            type="button"
            className="secondary-action"
            onClick={directMessage.openDirectMessage}
            disabled={isRemoving || directMessage.isOpening}
          >
            <MessageSquare aria-hidden="true" strokeWidth={2.1} />
            {directMessage.isOpening ? 'Abriendo...' : 'Enviar mensaje'}
          </button>
        ) : null}
        <button type="button" className={styles.profileAction} onClick={() => onViewProfile?.(profile)} disabled={isRemoving}>
          Ver perfil
          <ChevronRight aria-hidden="true" strokeWidth={2.1} />
        </button>
      </footer>
    </article>
  )
}
