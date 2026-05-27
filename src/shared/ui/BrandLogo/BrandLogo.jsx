import { useSyncExternalStore } from 'react'
import blackLogo from '../../../assets/icons/helpme_logo_black.png'
import whiteLogo from '../../../assets/icons/helme_logo_white.png'
import styles from './BrandLogo.module.css'

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

export default function BrandLogo({ variant = 'auto', size = 'md', align = 'left', className = '' }) {
  const resolvedVariant = useSyncExternalStore(
    subscribeToThemeChanges,
    () => resolveVariant(variant),
    () => (variant === 'auto' ? 'light' : variant),
  )

  const logoSrc = resolvedVariant === 'dark' ? whiteLogo : blackLogo
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
      <img className={imageClassName} src={logoSrc} alt="helpMe" decoding="async" />
    </span>
  )
}
