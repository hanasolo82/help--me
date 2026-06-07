import SkillBadge from '../../skills/components/SkillBadge'
import styles from '../../profile/styles/profileNetwork.module.css'
import { getAvatarInitial } from '../../../utils/avatar'

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
        const initial = getAvatarInitial(name)

        return (
          <article key={helper.id} className={styles.helperCard}>
            <div className={styles.helperMarkerCompact}>
              {helper.avatar_url ? <img className={styles.helperMarkerAvatar} src={helper.avatar_url} alt={name} /> : <span className={styles.helperMarkerFallback}>{initial}</span>}
            </div>

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
              <div className={styles.actionRow} style={{ marginTop: '0.75rem' }}>
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
