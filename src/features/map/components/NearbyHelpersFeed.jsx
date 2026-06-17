import SkillBadge from '../../skills/components/SkillBadge'
import UserAvatar from '../../../shared/ui/UserAvatar'
import styles from '../../profile/styles/profileNetwork.module.css'

export default function NearbyHelpersFeed({ helpers = [], onHelperSelect }) {
  if (!helpers.length) {
    return (
      <div className={styles.emptyState}>
        <strong>No encontramos helpers cercanos.</strong>
        <p className="muted">Mueve el mapa o completa la ubicación del perfil.</p>
      </div>
    )
  }

  return (
    <div className={styles.helperFeed}>
      {helpers.map((helper) => {
        const name = helper.display_name || helper.full_name || helper.username || 'Vecino'

        return (
          <article key={helper.id} className={styles.helperCard}>
            <UserAvatar
              src={helper.avatar_url}
              name={name}
              alt={name}
              size="sm"
              className={styles.helperMarkerCompact}
            />

            <div>
              <strong>{name}</strong>
              <p className="muted">
                ⭐ {Number(helper.rating ?? 0).toFixed(1)} · {helper.distance_km?.toFixed(1) ?? '0.0'} km · {helper.city || helper.neighborhood || 'Zona cercana'}
              </p>
              <div className={styles.helperCardFooter}>
                {(helper.skills ?? []).slice(0, 3).map((skill) => (
                  <SkillBadge key={skill.id} skill={skill} type="span" />
                ))}
              </div>
              <div className={`${styles.actionRow} ${styles.helperFeedActionRow}`}>
                <button type="button" className="secondary-action" onClick={() => onHelperSelect?.(helper)}>
                  Ver perfil
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
