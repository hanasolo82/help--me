import styles from '../../profile/styles/profileNetwork.module.css'

function getAverage(reviews = [], profileRating = 0) {
  if (reviews.length === 0) return Number(profileRating || 0).toFixed(1)
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0)
  return (total / reviews.length).toFixed(1)
}

function buildDistribution(reviews = []) {
  const counts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => Number(review.rating || 0) === rating).length,
  }))
  const max = Math.max(...counts.map((entry) => entry.count), 1)

  return counts.map((entry) => ({
    ...entry,
    percent: Math.round((entry.count / max) * 100),
  }))
}

export default function RatingSummary({ profile, reviews = [] }) {
  const average = getAverage(reviews, profile?.rating)
  const distribution = buildDistribution(reviews)
  const totalReviews = reviews.length || profile?.reviews_count || 0

  return (
    <div className={styles.ratingSummary}>
      <div className={styles.ratingHeader}>
        <strong className={styles.ratingValue}>{average}</strong>
        <p className="muted">
          {totalReviews} review{totalReviews === 1 ? '' : 's'} · {Number(profile?.completed_tasks ?? 0)} tareas completadas
        </p>
      </div>

      <div className={styles.ratingBarList}>
        {distribution.map((entry) => (
          <div key={entry.rating} className={styles.ratingBar}>
            <span>{entry.rating} estrellas</span>
            <div className={styles.ratingTrack} aria-hidden="true">
              <span className={styles.ratingFill} style={{ width: `${entry.percent}%` }} />
            </div>
            <strong>{entry.count}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
