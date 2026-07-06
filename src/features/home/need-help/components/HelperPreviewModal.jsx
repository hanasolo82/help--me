import { useMemo } from 'react'
import SkillBadge from '../../../skills/components/SkillBadge'
import Modal, { ModalBody, ModalHeader } from '../../../../shared/ui/Modal/Modal'
import UserAvatar from '../../../../shared/ui/UserAvatar'
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

  if (!helper) return null

  const name = helper.display_name || helper.full_name || helper.username || 'Vecino'

  return (
    <Modal open={open} onClose={onClose} size="lg" ariaLabel={`Vista previa de ${name}`}>
      <ModalHeader closeLabel="Cerrar vista previa">
        <div className={styles.identity}>
          <UserAvatar
            src={helper.avatar_url}
            name={name}
            alt={name}
            size="lg"
            variant="rounded"
            className={styles.avatar}
          />
          <div className={styles.summary}>
            <p className="eyebrow">Persona disponible</p>
            <h2>{name}</h2>
            <p className="muted">{formatDistance(helper.distance_km)}</p>
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
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
      </ModalBody>

      <div className={styles.actions}>
        <button type="button" className="secondary-action" onClick={() => onViewProfile?.(helper)} disabled={contactPending}>
          Ver perfil
        </button>
        <button type="button" className="secondary-action" onClick={() => onContact?.(helper)} disabled={contactPending}>
          {contactPending ? 'Preparando...' : 'Pedir ayuda'}
        </button>
        <button type="button" className="primary-action" onClick={() => onSendProposal?.(helper)} disabled={contactPending}>
          Publicar solicitud
        </button>
      </div>
    </Modal>
  )
}
