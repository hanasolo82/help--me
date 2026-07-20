import { useId, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ReviewCard from './ReviewCard'
import styles from '../../profile/styles/profileNetwork.module.css'

const INITIAL_VISIBLE_REVIEWS = 4

function sortReviews(reviews, order) {
  return [...reviews].sort((left, right) => {
    if (order === 'highest') return Number(right.rating || 0) - Number(left.rating || 0)
    if (order === 'lowest') return Number(left.rating || 0) - Number(right.rating || 0)

    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
  })
}

export default function ReviewsList({ reviews = [], isLoading = false, error = null }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [order, setOrder] = useState('recent')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [commentsOnly, setCommentsOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_REVIEWS)
  const listId = useId()

  const filteredReviews = useMemo(() => {
    const filtered = reviews.filter((review) => {
      const matchesRating = ratingFilter === 'all' || Number(review.rating) === Number(ratingFilter)
      const hasComment = Boolean(String(review.comment || '').trim())
      return matchesRating && (!commentsOnly || hasComment)
    })

    return sortReviews(filtered, order)
  }, [commentsOnly, order, ratingFilter, reviews])

  function resetVisibleCount() {
    setVisibleCount(INITIAL_VISIBLE_REVIEWS)
  }

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
        <strong>Aún no hay opiniones.</strong>
        <p className="muted">Cuando una tarea se complete, la reputación empezará a crecer aquí.</p>
      </div>
    )
  }

  return (
    <div className={styles.reviewsDisclosure}>
      <button
        type="button"
        className={styles.reviewsDisclosureButton}
        aria-expanded={isExpanded}
        aria-controls={listId}
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span>{isExpanded ? 'Ocultar opiniones' : `Ver ${reviews.length} ${reviews.length === 1 ? 'opinión' : 'opiniones'}`}</span>
        <ChevronDown
          className={isExpanded ? styles.reviewsDisclosureIconOpen : styles.reviewsDisclosureIcon}
          aria-hidden="true"
          strokeWidth={2.2}
        />
      </button>

      {isExpanded ? (
        <div id={listId} className={styles.reviewsExpanded}>
          <div className={styles.reviewToolbar} aria-label="Ordenar y filtrar opiniones">
            <label className={styles.reviewControl}>
              <span>Ordenar</span>
              <select
                value={order}
                onChange={(event) => {
                  setOrder(event.target.value)
                  resetVisibleCount()
                }}
              >
                <option value="recent">Más recientes</option>
                <option value="highest">Mejor valoradas</option>
                <option value="lowest">Peor valoradas</option>
              </select>
            </label>

            <label className={styles.reviewControl}>
              <span>Valoración</span>
              <select
                value={ratingFilter}
                onChange={(event) => {
                  setRatingFilter(event.target.value)
                  resetVisibleCount()
                }}
              >
                <option value="all">Todas</option>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>{rating} estrellas</option>
                ))}
              </select>
            </label>

            <label className={styles.reviewCheckbox}>
              <input
                type="checkbox"
                checked={commentsOnly}
                onChange={(event) => {
                  setCommentsOnly(event.target.checked)
                  resetVisibleCount()
                }}
              />
              <span>Solo con comentario</span>
            </label>
          </div>

          {filteredReviews.length > 0 ? (
            <>
              <div className={styles.reviewList}>
                {filteredReviews.slice(0, visibleCount).map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>

              {visibleCount < filteredReviews.length ? (
                <button
                  type="button"
                  className={styles.reviewMoreButton}
                  onClick={() => setVisibleCount((current) => current + INITIAL_VISIBLE_REVIEWS)}
                >
                  Mostrar más
                </button>
              ) : null}
            </>
          ) : (
            <div className={styles.emptyState}>
              <strong>No hay opiniones con estos filtros.</strong>
              <p className="muted">Prueba otra valoración o muestra también las opiniones sin comentario.</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
