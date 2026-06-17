import { useState } from 'react'
import { getAvatarInitial } from '../../../utils/avatar'
import styles from './UserAvatar.module.css'

const sizeClassNames = {
  xs: styles.xs,
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
}

const variantClassNames = {
  circle: styles.circle,
  rounded: styles.rounded,
  soft: styles.soft,
}

export default function UserAvatar({
  src,
  name,
  alt,
  size = 'md',
  variant = 'circle',
  verified = false,
  loading = false,
  className = '',
  fallback = 'U',
  decorative = false,
}) {
  const [failedImage, setFailedImage] = useState(null)
  const hasImage = Boolean(src) && failedImage !== src
  const initial = getAvatarInitial(name, fallback)
  const avatarClassName = [
    styles.avatar,
    sizeClassNames[size] || sizeClassNames.md,
    variantClassNames[variant] || variantClassNames.circle,
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={avatarClassName} aria-hidden={decorative ? 'true' : undefined}>
      {hasImage ? (
        <img
          src={src}
          alt={decorative ? '' : alt || name || 'Avatar'}
          loading="lazy"
          decoding="async"
          onError={() => setFailedImage(src)}
        />
      ) : (
        <span className={styles.fallback}>{initial}</span>
      )}
      {verified ? <span className={styles.badge} aria-label="Perfil verificado" /> : null}
    </span>
  )
}
