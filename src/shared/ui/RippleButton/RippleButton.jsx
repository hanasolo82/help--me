import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styles from './RippleButton.module.css'

const VARIANT_CLASS = {
  primary: styles.primary,
  secondary: styles.secondary,
  danger: styles.danger,
  ghost: styles.ghost,
}

const SIZE_CLASS = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
}

let rippleId = 0

const RippleButton = forwardRef(function RippleButton(
  {
    variant = 'primary',
    size = 'md',
    rippleColor,
    duration = 650,
    fullWidth = false,
    className = '',
    type = 'button',
    disabled = false,
    onClick,
    style,
    children,
    ...props
  },
  ref,
) {
  const buttonRef = useRef(null)
  const cleanupTimersRef = useRef([])
  const [ripples, setRipples] = useState([])

  useImperativeHandle(ref, () => buttonRef.current)

  useEffect(() => {
    return () => {
      cleanupTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
      cleanupTimersRef.current = []
    }
  }, [])

  function handleClick(event) {
    if (disabled) {
      return
    }

    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const isKeyboardTriggered = event.detail === 0 || (event.clientX === 0 && event.clientY === 0)
    const x = isKeyboardTriggered ? rect.width / 2 : event.clientX - rect.left
    const y = isKeyboardTriggered ? rect.height / 2 : event.clientY - rect.top
    const size = Math.max(rect.width, rect.height) * 2.4
    const id = rippleId += 1

    setRipples((current) => [...current, { id, x, y, size }])

    const timerId = window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id))
      cleanupTimersRef.current = cleanupTimersRef.current.filter((existing) => existing !== timerId)
    }, duration)

    cleanupTimersRef.current.push(timerId)

    onClick?.(event)
  }

  const resolvedClassName = [
    styles.button,
    VARIANT_CLASS[variant] || VARIANT_CLASS.primary,
    SIZE_CLASS[size] || SIZE_CLASS.md,
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={buttonRef}
      type={type}
      className={resolvedClassName}
      disabled={disabled}
      onClick={handleClick}
      style={{
        '--ripple-duration': `${duration}ms`,
        ...(rippleColor ? { '--ripple-color': rippleColor } : null),
        ...style,
      }}
      {...props}
    >
      <span className={styles.content}>{children}</span>
      <span className={styles.ripples} aria-hidden="true">
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className={styles.ripple}
            style={{
              left: `${ripple.x - ripple.size / 2}px`,
              top: `${ripple.y - ripple.size / 2}px`,
              width: `${ripple.size}px`,
              height: `${ripple.size}px`,
            }}
          />
        ))}
      </span>
    </button>
  )
})

export default RippleButton
