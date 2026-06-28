import ActivityIcon from './ActivityIcon'
import { getTaskCategoryStyle, getTaskCategoryVisual } from './taskCategories'
import styles from './ActivityBadge.module.css'

export default function ActivityBadge({
  category,
  label,
  compact = false,
  className = '',
}) {
  const visual = getTaskCategoryVisual(category)
  const text = label || visual.label

  return (
    <span
      className={`${styles.badge} ${compact ? styles.compact : ''} ${className}`.trim()}
      style={getTaskCategoryStyle(category)}
      aria-label={`Actividad: ${text}`}
    >
      <span className={styles.iconShell} aria-hidden="true">
        <ActivityIcon category={category} size={compact ? 18 : 22} decorative />
      </span>
      <span className={styles.label}>{text}</span>
    </span>
  )
}
