import { forwardRef } from 'react'
import styles from './GlitchSoftButton.module.css'

const VARIANT_CLASS = {
  primary: styles.primary,
  secondary: styles.secondary,
  accent: styles.accent,
  ghost: styles.ghost,
}

function getLabelText(children) {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }

  return ''
}

const GlitchSoftButton = forwardRef(function GlitchSoftButton(
  {
    variant = 'primary',
    disabled = false,
    onClick,
    className = '',
    type = 'button',
    children,
    ...props
  },
  ref,
) {
  const labelText = getLabelText(children)
  const resolvedClassName = [styles.button, VARIANT_CLASS[variant] || VARIANT_CLASS.primary, className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={resolvedClassName}
      disabled={disabled}
      onClick={onClick}
      data-text={labelText}
      {...props}
    >
      <span className={styles.content}>{children}</span>
    </button>
  )
})

export default GlitchSoftButton
