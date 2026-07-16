import { Heart } from 'lucide-react'
import { useFavoriteProfile } from '../hooks/useFavoriteProfile'
import styles from './FavoriteHeart.module.css'

export default function FavoriteHeart({
  helperId,
  isFavorite: isFavoriteOverride,
  onToggleFavorite,
  disabled = false,
  size = 'md',
  className = '',
}) {
  const favorite = useFavoriteProfile(helperId)
  const isFavorite = typeof isFavoriteOverride === 'boolean' ? isFavoriteOverride : favorite.isFavorite
  const isPending = disabled || favorite.isPending
  const sizeClass = size === 'sm' ? styles.sm : ''

  if (!helperId) return null

  function handleToggle(event) {
    event.preventDefault()
    event.stopPropagation()

    if (isPending) return

    if (onToggleFavorite) {
      onToggleFavorite(helperId)
      return
    }

    favorite.mutate()
  }

  return (
    <button
      type="button"
      className={`${styles.root} ${sizeClass} ${isFavorite ? styles.isFavorite : ''} ${className}`.trim()}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
      aria-pressed={isFavorite}
    >
      <Heart aria-hidden="true" strokeWidth={2.1} />
    </button>
  )
}
