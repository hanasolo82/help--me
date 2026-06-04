import { useMemo } from 'react'
import { getAvatarInitial } from '../../../../utils/avatar'
import SkillBadge from '../../../skills/components/SkillBadge'
import styles from './HelperPreviewModal.module.css'

function formatDistance(distanceKm) {
  if (!Number.isFinite(Number(distanceKm))) return 'Cerca de ti'
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

function buildSkillList(helper) {
  const skills = (helper?.skills || []).slice(0, 3).map((skill) => ({
    name: skill?.name || skill?.category || 'Ayuda general',
    icon: skill?.icon || '🏷️',
  }))

  return skills.length > 0 ? skills : [{ name: 'Ayuda general', icon: '✨' }]
}

export default function HelperPreviewModal({
  open,
  helper,
  onClose,
  onViewProfile,
  onContact,
  contactPending = false,
  onSendProposal,
}) {
  const skills = useMemo(() => buildSkillList(helper), [helper])

  if (!open || !helper) return null

  const name = helper.display_name || helper.full_name || helper.username || 'Vecino'
  const avatarInitial = getAvatarInitial(name)

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {helper.avatar_url ? <img src={helper.avatar_url} alt={name} /> : avatarInitial}
            </div>
            <div className={styles.summary}>
              <p className="eyebrow">Persona disponible</p>
              <h2>{name}</h2>
              <p className="muted">{formatDistance(helper.distance_km)}</p>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar vista previa">
            ×
          </button>
        </div>

        <div className={styles.meta}>
          <span>{formatRating(helper)}</span>
          <span>{helper.availability_enabled === false ? 'No disponible' : 'Disponible'}</span>
        </div>

        <div className={styles.skills}>
          {skills.map((skill) => (
            <SkillBadge key={skill.name} skill={skill} type="span" />
          ))}
        </div>

        <p className={styles.description}>{helper.bio || 'Ayuda general y trato cercano dentro de la comunidad.'}</p>

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => onViewProfile?.(helper)} disabled={contactPending}>
            Ver perfil
          </button>
          <button type="button" className="secondary-action" onClick={() => onContact?.(helper)} disabled={contactPending}>
            {contactPending ? 'Abriendo chat...' : 'Contactar'}
          </button>
          <button type="button" className="primary-action" onClick={() => onSendProposal?.(helper)} disabled={contactPending}>
            Publicar solicitud
          </button>
        </div>
      </section>
    </div>
  )
}
