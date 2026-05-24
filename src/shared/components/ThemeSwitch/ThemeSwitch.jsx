import { Moon, Sun } from 'lucide-react'
import styles from './ThemeSwitch.module.css'

export default function ThemeSwitch({
  checked = false,
  onCheckedChange,
  className = '',
}) {
  const nextLabel = checked ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'
  const rootClassName = `${styles.switch} ${checked ? styles.switchChecked : ''} ${className}`.trim()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={nextLabel}
      className={rootClassName}
      onClick={() => onCheckedChange?.(!checked)}
    >
      <span className={styles.srOnly}>{nextLabel}</span>
      <span className={styles.icon} aria-hidden="true">
        <Moon size={16} strokeWidth={2} />
      </span>
      <span className={styles.icon} aria-hidden="true">
        <Sun size={16} strokeWidth={2} />
      </span>
      <span className={styles.thumb} aria-hidden="true" />
    </button>
  )
}
