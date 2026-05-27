import { useSyncExternalStore } from 'react'
import blackLogo from '../../../assets/icons/helpme_logo_black.png'
import whiteLogo from '../../../assets/icons/helpme_logo_white.png'
import styles from './BrandLogo.module.css'

const SIZE_CLASSES = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
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

export default function BrandLogo({ variant = 'auto', size = 'md', className = '' }) {
  const resolvedVariant = useSyncExternalStore(
    subscribeToThemeChanges,
    () => resolveVariant(variant),
    () => (variant === 'auto' ? 'light' : variant),
  )

  const logoSrc = resolvedVariant === 'dark' ? whiteLogo : blackLogo
  const rootClassName = [styles.logo, SIZE_CLASSES[size] ?? SIZE_CLASSES.md, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={rootClassName} data-variant={resolvedVariant}>
      <img className={styles.image} src={logoSrc} alt="helpMe" decoding="async" />
    </span>
  )
}
