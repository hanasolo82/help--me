import { useId } from 'react'
import { getTaskActivityKey, getTaskCategoryStyle, getTaskCategoryVisual } from './taskCategories'
import styles from './ActivityIcon.module.css'

function ActivityGlyph({ activityKey }) {
  switch (activityKey) {
    case 'cleaning':
      return (
        <>
          <rect x="6" y="10" width="12" height="7" rx="2" className={styles.softFill} />
          <path d="M8 9l2-3 2 3" className={styles.line} />
          <path d="M15 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" className={styles.accentFill} />
        </>
      )
    case 'moving':
      return (
        <>
          <path d="M6 8.5h10.5l2 3.2V18H6z" className={styles.softFill} />
          <path d="M9 8.5V6h5v2.5M9 13h6M14 11l2 2-2 2" className={styles.accentLine} />
        </>
      )
    case 'errands':
      return (
        <>
          <path d="M7 9h10l-.8 9H7.8z" className={styles.softFill} />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0" className={styles.line} />
          <path d="M10 13.2l1.6 1.6 3.3-3.5" className={styles.accentLine} />
        </>
      )
    case 'repairs':
      return (
        <>
          <path d="M15.8 5.5a4 4 0 0 0 2.7 5l-7.7 7.7a2 2 0 0 1-2.8-2.8l7.8-7.8a4 4 0 0 0 0-2.1z" className={styles.softFill} />
          <circle cx="9.2" cy="16.8" r="1" className={styles.accentFill} />
        </>
      )
    case 'classes':
      return (
        <>
          <path d="M6 7.5c2.2-.8 4.2-.6 6 .8 1.8-1.4 3.8-1.6 6-.8V18c-2.2-.8-4.2-.6-6 .8-1.8-1.4-3.8-1.6-6-.8z" className={styles.softFill} />
          <path d="M12 8.3v10M15.2 11.5l2.5 2.5" className={styles.accentLine} />
        </>
      )
    case 'care':
      return (
        <>
          <circle cx="9" cy="9" r="2.4" className={styles.softFill} />
          <circle cx="15" cy="9" r="2.4" className={styles.softFill} />
          <path d="M6.5 18c.9-2.4 3.3-3.4 5.5-2.1 2.2-1.3 4.6-.3 5.5 2.1" className={styles.line} />
          <path d="M12 14.2l-1.6-1.5a1.5 1.5 0 0 1 2.1-2.1 1.5 1.5 0 0 1 2.1 2.1z" className={styles.accentFill} />
        </>
      )
    case 'pets':
      return (
        <>
          <circle cx="8.2" cy="8.2" r="1.7" className={styles.accentFill} />
          <circle cx="12" cy="6.8" r="1.8" className={styles.accentFill} />
          <circle cx="15.8" cy="8.2" r="1.7" className={styles.accentFill} />
          <circle cx="9.4" cy="12" r="1.6" className={styles.accentFill} />
          <circle cx="14.6" cy="12" r="1.6" className={styles.accentFill} />
          <path d="M7.5 17.2c1.1-3.2 3-4.7 4.5-4.7s3.4 1.5 4.5 4.7c.4 1.2-.5 2.3-1.8 2l-1.1-.3a6 6 0 0 0-3.2 0l-1.1.3c-1.3.3-2.2-.8-1.8-2z" className={styles.softFill} />
        </>
      )
    case 'tech':
      return (
        <>
          <rect x="8" y="4.8" width="8" height="14.4" rx="2.2" className={styles.softFill} />
          <path d="M11 16.5h2" className={styles.line} />
          <path d="M17 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" className={styles.accentFill} />
        </>
      )
    default:
      return (
        <>
          <path d="M12 4.8l1.7 4 4.3.4-3.2 2.8 1 4.2-3.8-2.2-3.8 2.2 1-4.2L6 9.2l4.3-.4z" className={styles.softFill} />
          <circle cx="12" cy="12" r="1.7" className={styles.accentFill} />
        </>
      )
  }
}

export default function ActivityIcon({
  category,
  size = 24,
  decorative = false,
  title,
  className = '',
}) {
  const visual = getTaskCategoryVisual(category)
  const activityKey = getTaskActivityKey(category)
  const label = title || visual.label
  const iconId = useId()
  const labelledBy = decorative ? undefined : `activity-icon-${activityKey}-${iconId}`

  return (
    <svg
      className={`${styles.icon} ${className}`.trim()}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-labelledby={labelledBy}
      focusable="false"
      style={getTaskCategoryStyle(category)}
    >
      {decorative ? null : <title id={labelledBy}>{label}</title>}
      <ActivityGlyph activityKey={activityKey} />
    </svg>
  )
}
