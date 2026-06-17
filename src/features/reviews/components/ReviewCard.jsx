import UserAvatar from '../../../shared/ui/UserAvatar'
import styles from '../../profile/styles/profileNetwork.module.css'

function scoreLabel(value) {
  if (value >= 5) return 'Excelente'
  if (value >= 4) return 'Muy bien'
  if (value >= 3) return 'Correcto'
  return 'Por mejorar'
}

export default function ReviewCard({ review }) {
  const reviewer = review?.reviewer || {}
  const reviewerName = reviewer.display_name || reviewer.full_name || reviewer.username || 'Vecino'
  const taskTitle = review?.task?.title || 'Tarea completada'
  const tags = Array.isArray(review?.tags) ? review.tags.filter(Boolean) : []

  return (
    <article className={styles.reviewCard}>
      <div className={styles.reviewMeta}>
        <UserAvatar
          src={reviewer.avatar_url}
          name={reviewerName}
          alt={reviewerName}
          size="sm"
          className={styles.reviewAvatar}
        />
        <div className={styles.reviewName}>
          <strong>{reviewerName}</strong>
          <span>@{reviewer.username || 'helpMe'}</span>
          <p className="muted">{taskTitle}</p>
        </div>
      </div>

      <p className="muted">{review.comment || 'Sin comentario adicional.'}</p>

      {tags.length > 0 && (
        <div className={styles.reviewTags}>
          {tags.map((tag) => (
            <span key={tag} className={styles.reviewBadge}>{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.reviewScores}>
        <span className={styles.reviewBadge}>⭐ {review.rating}/5</span>
        <span className={styles.reviewBadge}>💬 {scoreLabel(review.communication_rating)}</span>
        <span className={styles.reviewBadge}>⏱️ {scoreLabel(review.punctuality_rating)}</span>
        <span className={styles.reviewBadge}>🤝 {scoreLabel(review.trust_rating)}</span>
      </div>
    </article>
  )
}
