import styles from './shine-border.module.css'

export function ShineBorder({
  as: Component = 'div',
  className = '',
  contentClassName = '',
  children,
  borderRadius,
  duration = 9,
  ...props
}) {
  const resolvedClassName = [styles.shineBorder, className].filter(Boolean).join(' ')
  const resolvedContentClassName = [styles.shineBorderContent, contentClassName].filter(Boolean).join(' ')

  return (
    <Component
      className={resolvedClassName}
      style={{
        '--shine-duration': `${duration}s`,
        ...(borderRadius ? { '--shine-radius': borderRadius } : null),
      }}
      {...props}
    >
      <span className={styles.shineBorderGlow} aria-hidden="true" />
      <div className={resolvedContentClassName}>{children}</div>
    </Component>
  )
}
