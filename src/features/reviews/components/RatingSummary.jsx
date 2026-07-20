import styles from '../../profile/styles/profileNetwork.module.css'
import { formatRating } from '../utils/ratingFormat'
import RatingStars from './RatingStars'

function getAverage(reviews = [], profileRating = 0) {
  if (reviews.length === 0) return Number(profileRating || 0).toFixed(1)
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0)
  return (total / reviews.length).toFixed(1)
}

function buildDistribution(reviews = []) {
  const total = reviews.length
  const counts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Number(review.rating || 0) === rating).length,
  }))

  return counts.map((entry) => ({
    ...entry,
    percent: total > 0 ? Math.round((entry.count / total) * 100) : 0,
  }))
}

export default function RatingSummary({ profile, reviews = [] }) {
  const average = getAverage(reviews, profile?.rating)
  const distribution = buildDistribution(reviews)
  const totalReviews = reviews.length || profile?.reviews_count || 0

  return (
    <div className={styles.ratingSummary}>
      <div className={styles.ratingHeader}>
        <div className={styles.ratingScoreRow}>
          <strong className={styles.ratingValue}>{formatRating(average)}</strong>
          <RatingStars value={average} size="lg" />
        </div>
        <p className="muted">
          {totalReviews} {totalReviews === 1 ? 'opinión' : 'opiniones'} · {Number(profile?.completed_tasks ?? 0)} tareas completadas
        </p>
      </div>

      {reviews.length > 0 ? (
        <div className={styles.ratingBarList} aria-label="Distribución de valoraciones">
          {distribution.map((entry) => (
            <div key={entry.rating} className={styles.ratingBar}>
              <span>{entry.rating}</span>
              <div
                className={styles.ratingTrack}
                role="img"
                aria-label={`${entry.count} opiniones de ${entry.rating} estrellas`}
              >
                <span className={styles.ratingFill} style={{ width: `${entry.percent}%` }} />
              </div>
              <strong>{entry.count}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
