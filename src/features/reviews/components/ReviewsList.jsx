import ReviewCard from './ReviewCard'
import styles from '../../profile/styles/profileNetwork.module.css'

export default function ReviewsList({ reviews = [], isLoading = false, error = null }) {
  if (isLoading) {
    return (
      <div className={styles.emptyState}>
        <strong>Cargando reviews...</strong>
        <p className="muted">Estamos trayendo la reputación del perfil.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <strong>No pudimos cargar las reviews.</strong>
        <p className="muted">{error.message || 'Revisa la conexión o intenta de nuevo.'}</p>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className={styles.emptyState}>
        <strong>Aún no hay reviews.</strong>
        <p className="muted">Cuando una tarea se complete, la reputación empezará a crecer aquí.</p>
      </div>
    )
  }

  return (
    <div className={styles.reviewList}>
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

