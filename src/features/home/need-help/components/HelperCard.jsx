import { BadgeCheck, ChevronRight, MapPin, MessageSquare, ShieldCheck, Star } from 'lucide-react'
import UserAvatar from '../../../../shared/ui/UserAvatar'
import FavoriteHeart from '../../../profile/components/FavoriteHeart'
import { CategoryIcon, style as designStyle } from '../../../../design'
import { useDirectMessage } from '../../../chat/hooks/useDirectMessage'
import { canHelperReceiveDirectRequest } from '../../../tasks/direct-requests/directRequestCategories'
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
    return 'Nuevo helper'
  }

  return `${rating.toFixed(1)}/5 · ${reviews} valoraciones`
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
  const skills = (helper?.skills || []).map((skill) => ({
    id: skill?.id || null,
    name: skill?.name || skill?.category || 'Ayuda general',
    category: skill?.category || skill?.name || 'Otros',
  }))

  if (skills.length === 0) {
    return [{ id: null, name: 'Ayuda general', category: 'Otros' }]
  }

  return skills
}

function buildTrustItems(helper) {
  const items = []

  if (Number(helper?.completed_tasks ?? 0) > 0) {
    items.push(`${Number(helper.completed_tasks)} tareas`)
  }

  return items.slice(0, 3)
}

function hasStripeVerifiedProfile(helper) {
  return helper?.stripe_profile_verified === true
}

function getVisibleSkills(skills) {
  return {
    visible: skills.slice(0, 3),
    extraCount: Math.max(0, skills.length - 3),
  }
}

export default function HelperCard({ helper, selected = false, onSelect, onOpenProfile, onContact }) {
  const name = helper?.display_name || helper?.full_name || helper?.username || 'Vecino'
  const isStripeVerified = hasStripeVerifiedProfile(helper)
  const skills = buildSkillList(helper)
  const trustItems = buildTrustItems(helper)
  const { visible: visibleSkills, extraCount } = getVisibleSkills(skills)
  const canContact = canHelperReceiveDirectRequest(helper)
  // Mismo gate/apertura que perfil y HelperPreviewModal. El botón "Contacto"
  // se renderiza SIEMPRE; el gate solo decide si está habilitado. El title
  // únicamente atribuye rechazo al helper cuando el gate respondió false
  // ('unavailable'), nunca en 'error'/'idle' (gate caído o pendiente).
  const directMessage = useDirectMessage(helper?.id)
  const contactDisabled = !directMessage.canMessage || directMessage.isOpening
  const contactTitle = directMessage.rejectsMessages ? 'No recibe mensajes directos por ahora' : undefined
  const availabilityLabel = formatAvailability(helper)
  const ratingLabel = formatRating(helper)
  const ratingAriaLabel = ratingLabel === 'Nuevo helper'
    ? 'Nuevo helper sin valoraciones todavía'
    : `Valoración media ${ratingLabel}`

  return (
    <article
      className={selected ? `${styles.helperCard} ${styles.helperCardSelected}` : styles.helperCard}
    >
      <div className={styles.helperCardTop}>
        <div className={availabilityLabel === 'Disponible' ? `${styles.helperAvatarWrap} ${styles.helperAvatarAvailable}` : styles.helperAvatarWrap}>
          <UserAvatar
            src={helper?.avatar_url}
            name={name}
            alt={name}
            size="lg"
            variant="circle"
            verified={false}
            className={styles.helperAvatar}
          />
        </div>

        <div className={styles.helperCardContent}>
          <div className={styles.helperCardHeading}>
            <div className={styles.helperNameRow}>
              <strong>{name}</strong>
              {isStripeVerified ? (
                <span
                  className={styles.helperVerifiedIcon}
                  aria-label="Cuenta habilitada por Stripe para recibir pagos"
                  title="Cuenta habilitada por Stripe para recibir pagos"
                >
                  <BadgeCheck aria-hidden="true" strokeWidth={2.25} />
                </span>
              ) : null}
            </div>
            <div className={styles.helperHeadingActions}>
              <FavoriteHeart helperId={helper?.id} size="sm" />
              <span className={styles.helperAvailability}>{availabilityLabel}</span>
            </div>
          </div>

          <div className={styles.helperTrustLine}>
            <span
              className={styles.helperRating}
              aria-label={ratingAriaLabel}
            >
              <Star aria-hidden="true" strokeWidth={2.2} />
              {ratingLabel}
            </span>
            <span className={styles.helperDistance}>
              <MapPin aria-hidden="true" strokeWidth={2.2} />
              {formatDistance(helper?.distance_km)}
            </span>
          </div>

          {trustItems.length > 0 ? (
            <div className={styles.helperTrustBadges} aria-label="Señales de confianza">
              {trustItems.map((item) => (
                <span key={item}>
                  <ShieldCheck aria-hidden="true" strokeWidth={2} />
                  {item}
                </span>
              ))}
            </div>
          ) : null}

          <p className={styles.helperDescription}>{helper?.bio || 'Ayuda general y trato cercano dentro de la comunidad.'}</p>

          <div className={styles.helperSkills} aria-label="Tareas que realiza">
            {visibleSkills.map((skill) => (
              <span key={skill.id || `${skill.category}-${skill.name}`}>
                <CategoryIcon category={skill.category} size={designStyle.iconSize.tag} tone="light" />
                {skill.name}
              </span>
            ))}
            {extraCount > 0 ? <span className={styles.helperSkillMore}>+{extraCount}</span> : null}
          </div>
        </div>
      </div>

      <div className={styles.helperActions}>
        <button
          type="button"
          className={styles.helperContactLink}
          disabled={contactDisabled}
          aria-disabled={contactDisabled}
          title={contactTitle}
          onClick={(event) => {
            event.stopPropagation()
            if (contactDisabled) return
            directMessage.openDirectMessage()
          }}
        >
          <MessageSquare aria-hidden="true" strokeWidth={2.2} />
          {directMessage.isOpening ? 'Abriendo...' : 'Contacto'}
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
            Pedir ayuda
          </button>
        )}

        <button
          type="button"
          className={styles.helperProfileLink}
          onClick={(event) => {
            event.stopPropagation()
            onSelect?.(helper)
            onOpenProfile?.(helper)
          }}
        >
          Ver perfil
          <ChevronRight aria-hidden="true" strokeWidth={2.2} />
        </button>
      </div>
    </article>
  )
}
