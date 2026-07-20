import UserAvatar from '../../../shared/ui/UserAvatar'
import ActivityIcon from '../../tasks/categories/ActivityIcon'
import { formatRating } from '../utils/ratingFormat'
import RatingStars from './RatingStars'
import styles from '../../profile/styles/profileNetwork.module.css'

function formatReviewDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('es-ES', {
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function ReviewCard({ review }) {
  const reviewer = review?.reviewer || {}
  const reviewerName = reviewer.display_name || reviewer.full_name || reviewer.username || 'Vecino'
  const taskTitle = review?.task?.title || 'Tarea completada'
  const tags = Array.isArray(review?.tags) ? review.tags.filter(Boolean) : []
  const reviewDate = formatReviewDate(review?.created_at)
  const metrics = [
    { label: 'Comunicación', value: review?.communication_rating },
    { label: 'Puntualidad', value: review?.punctuality_rating },
    { label: 'Confianza', value: review?.trust_rating },
  ].filter((item) => Number.isFinite(Number(item.value)))

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
          <div className={styles.reviewNameLine}>
            <strong>{reviewerName}</strong>
            {reviewDate ? <time dateTime={review?.created_at}>{reviewDate}</time> : null}
          </div>
          <span>@{reviewer.username || 'helpMe'}</span>
        </div>
      </div>

      <div className={styles.reviewRatingLine}>
        <RatingStars value={review.rating} size="md" />
        <strong>{formatRating(review.rating)}</strong>
      </div>

      {review.comment ? <p className={styles.reviewComment}>{review.comment}</p> : null}

      <div className={styles.reviewTask}>
        <ActivityIcon category={review?.task?.category} size={22} decorative />
        <span>{taskTitle}</span>
      </div>

      {metrics.length > 0 ? (
        <dl className={styles.reviewMetrics}>
          {metrics.map((metric) => (
            <div key={metric.label}>
              <dt>{metric.label}</dt>
              <dd>{Number(metric.value).toFixed(0)}/5</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {tags.length > 0 ? (
        <p className={styles.reviewHighlights}>
          <strong>Destaca por:</strong> {tags.join(', ')}
        </p>
      ) : null}
    </article>
  )
}
