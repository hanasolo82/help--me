import { useSyncExternalStore } from 'react'
import styles from './BrandLogo.module.css'

const LOGO_URLS = {
  light: '/logos/helpme_logo_black.webp',
  dark: '/logos/helme_logo_white.webp',
}

// Dimensiones intrínsecas por variante (ratios distintos) para reservar espacio y evitar CLS.
const LOGO_DIMENSIONS = {
  light: { width: 578, height: 211 },
  dark: { width: 579, height: 188 },
}

const SIZE_CLASSES = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
}

const ALIGN_CLASSES = {
  left: styles.logoLeft,
  center: styles.logoCenter,
}

const IMAGE_ALIGN_CLASSES = {
  left: styles.imageLeft,
  center: styles.imageCenter,
}

function resolveVariant(variant) {
  if (variant !== 'auto') {
    return variant
  }

  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

function subscribeToThemeChanges(callback) {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const observer = new MutationObserver(callback)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })

  return () => observer.disconnect()
}

export default function BrandLogo({
  variant = 'auto',
  size = 'md',
  align = 'left',
  className = '',
  loading = 'eager',
}) {
  const resolvedVariant = useSyncExternalStore(
    subscribeToThemeChanges,
    () => resolveVariant(variant),
    () => (variant === 'auto' ? 'light' : variant),
  )

  const logoSrc = LOGO_URLS[resolvedVariant] ?? LOGO_URLS.light
  const logoDimensions = LOGO_DIMENSIONS[resolvedVariant] ?? LOGO_DIMENSIONS.light
  const rootClassName = [
    styles.logo,
    ALIGN_CLASSES[align] ?? ALIGN_CLASSES.left,
    SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  const imageClassName = [styles.image, IMAGE_ALIGN_CLASSES[align] ?? IMAGE_ALIGN_CLASSES.left]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={rootClassName} data-variant={resolvedVariant}>
      <img
        className={imageClassName}
        src={logoSrc}
        alt="HelpMe"
        width={logoDimensions.width}
        height={logoDimensions.height}
        loading={loading}
        decoding="async"
      />
    </span>
  )
}
