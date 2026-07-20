import { Star } from 'lucide-react'
import { clampRating, formatRating } from '../utils/ratingFormat'
import styles from './RatingStars.module.css'

export default function RatingStars({ value = 0, size = 'md', className = '' }) {
  const rating = clampRating(value)
  const classes = [styles.ratingStars, styles[size], className].filter(Boolean).join(' ')

  return (
    <span className={classes} role="img" aria-label={`${formatRating(rating)} de 5 estrellas`}>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(Math.max(rating - index, 0), 1) * 100

        return (
          <span key={index} className={styles.star} aria-hidden="true">
            <Star className={styles.starEmpty} strokeWidth={1.8} />
            <span className={styles.starFillClip} style={{ width: `${fill}%` }}>
              <Star className={styles.starFilled} fill="currentColor" strokeWidth={1.8} />
            </span>
          </span>
        )
      })}
    </span>
  )
}
