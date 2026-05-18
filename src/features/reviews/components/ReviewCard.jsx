import { getAvatarInitial } from '../../../utils/avatar'
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
  const initial = getAvatarInitial(reviewerName)
  const taskTitle = review?.task?.title || 'Tarea completada'

  return (
    <article className={styles.reviewCard}>
      <div className={styles.reviewMeta}>
        <div className={styles.reviewAvatar}>
          {reviewer.avatar_url ? <img src={reviewer.avatar_url} alt={reviewerName} /> : initial}
        </div>
        <div className={styles.reviewName}>
          <strong>{reviewerName}</strong>
          <span>@{reviewer.username || 'helpMe'}</span>
          <p className="muted">{taskTitle}</p>
        </div>
      </div>

      <p className="muted">{review.comment || 'Sin comentario adicional.'}</p>

      <div className={styles.reviewScores}>
        <span className={styles.reviewBadge}>⭐ {review.rating}/5</span>
        <span className={styles.reviewBadge}>💬 {scoreLabel(review.communication_rating)}</span>
        <span className={styles.reviewBadge}>⏱️ {scoreLabel(review.punctuality_rating)}</span>
        <span className={styles.reviewBadge}>🤝 {scoreLabel(review.trust_rating)}</span>
      </div>
    </article>
  )
}

