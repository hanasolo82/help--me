import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import styles from './AnimatedDropdown.module.css'

const CLOSE_ANIMATION_MS = 170
const DropdownContext = createContext(null)

function getResolvedWidth(width) {
  if (typeof width === 'number') {
    return `${width}px`
  }

  return width || '240px'
}

function getResolvedMaxWidth(width) {
  if (typeof width === 'number') {
    return `min(${width}px, calc(100vw - 1rem))`
  }

  return `min(${width || '240px'}, calc(100vw - 1rem))`
}

function focusMenuItemAt(dropdownNode, nextIndex) {
  if (!dropdownNode) return

  const items = Array.from(dropdownNode.querySelectorAll('[role="menuitem"]'))
  if (items.length === 0) return

  const normalizedIndex = ((nextIndex % items.length) + items.length) % items.length
  const item = items[normalizedIndex]

  if (item instanceof HTMLElement) {
    item.focus()
  }
}

export function AnimatedDropdown({
  trigger,
  children,
  align = 'end',
  width = 240,
  isOpen = false,
  onOpenChange,
  closeOnSelect = true,
  portal = true,
  className = '',
}) {
  const [rendered, setRendered] = useState(isOpen)
  const [visible, setVisible] = useState(isOpen)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const closeTimerRef = useRef(null)
  const menuId = useId()

  const dropdownClassName = `${styles.dropdown} ${visible ? styles.dropdownOpen : styles.dropdownClosed} ${align === 'start' ? styles.alignStart : styles.alignEnd} ${className}`.trim()

  const content = useMemo(
    () => (
      <DropdownContext.Provider
        value={{
          closeOnSelect,
          closeDropdown: () => onOpenChange?.(false),
          dropdownRef,
        }}
      >
        <div
          ref={dropdownRef}
          id={menuId}
          className={dropdownClassName}
          role="menu"
          aria-label="Menú desplegable"
          data-state={visible ? 'open' : 'closed'}
          style={{
            width: getResolvedWidth(width),
            maxWidth: getResolvedMaxWidth(width),
            ...position,
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onOpenChange?.(false)
              return
            }

            if (event.key === 'ArrowDown') {
              event.preventDefault()
              const items = Array.from(dropdownRef.current?.querySelectorAll('[role="menuitem"]') || [])
              const activeIndex = items.indexOf(document.activeElement)
              focusMenuItemAt(dropdownRef.current, activeIndex + 1)
              return
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault()
              const items = Array.from(dropdownRef.current?.querySelectorAll('[role="menuitem"]') || [])
              const activeIndex = items.indexOf(document.activeElement)
              focusMenuItemAt(dropdownRef.current, activeIndex - 1)
              return
            }

            if (event.key === 'Home') {
              event.preventDefault()
              focusMenuItemAt(dropdownRef.current, 0)
              return
            }

            if (event.key === 'End') {
              event.preventDefault()
              const items = Array.from(dropdownRef.current?.querySelectorAll('[role="menuitem"]') || [])
              focusMenuItemAt(dropdownRef.current, items.length - 1)
            }
          }}
        >
          {children}
        </div>
      </DropdownContext.Provider>
    ),
    [align, children, className, closeOnSelect, menuId, onOpenChange, position, visible, width],
  )

  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      const rafId = window.requestAnimationFrame(() => setVisible(true))

      return () => window.cancelAnimationFrame(rafId)
    }

    setVisible(false)
    closeTimerRef.current = window.setTimeout(() => {
      setRendered(false)
      setPosition(null)
    }, CLOSE_ANIMATION_MS)

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!rendered || !triggerRef.current) return undefined

    const updatePosition = () => {
      const triggerNode = triggerRef.current
      const triggerRect = triggerNode.getBoundingClientRect()
      const dropdownWidth = typeof width === 'number' ? width : Math.min(triggerRect.width, window.innerWidth - 16)
      const maxWidth = window.innerWidth - 16
      const resolvedWidth = Math.min(dropdownWidth, maxWidth)
      const top = triggerRect.bottom + 10

      let left
      if (align === 'start') {
        left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - resolvedWidth - 8))
      } else {
        left = Math.max(8, Math.min(triggerRect.right - resolvedWidth, window.innerWidth - resolvedWidth - 8))
      }

      setPosition({
        top: `${top}px`,
        left: `${left}px`,
      })
    }

    updatePosition()

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [align, rendered, width])

  useEffect(() => {
    function handlePointerDown(event) {
      const target = event.target
      const insideTrigger = triggerRef.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)

      if (!insideTrigger && !insideDropdown) {
        onOpenChange?.(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        onOpenChange?.(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onOpenChange])

  const triggerNode = isValidElement(trigger)
    ? cloneElement(trigger, {
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
        'aria-controls': menuId,
        onClick: (event) => {
          trigger.props.onClick?.(event)
          if (event.defaultPrevented) return
          onOpenChange?.(!isOpen)
        },
        onKeyDown: (event) => {
          trigger.props.onKeyDown?.(event)
          if (event.defaultPrevented) return

          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onOpenChange?.(true)
          }
        },
      })
    : trigger

  if (!rendered) {
    return isValidElement(trigger) ? (
      <span ref={triggerRef} className={styles.triggerShell}>
        {triggerNode}
      </span>
    ) : (
      triggerNode
    )
  }

  const dropdownNode = portal ? createPortal(content, document.body) : content

  return (
    <>
      {isValidElement(trigger) ? (
        <span ref={triggerRef} className={styles.triggerShell}>
          {triggerNode}
        </span>
      ) : (
        triggerNode
      )}
      {dropdownNode}
    </>
  )
}

function DropdownGroup({ title, children }) {
  return (
    <div className={styles.group}>
      {title ? <p className={styles.groupTitle}>{title}</p> : null}
      <div className={styles.groupItems}>{children}</div>
    </div>
  )
}

function DropdownDivider() {
  return <div className={styles.divider} aria-hidden="true" />
}

function DropdownItem({
  children,
  onClick,
  danger = false,
  closeOnSelect: closeOnSelectProp,
  className = '',
  description = '',
  ...props
}) {
  const context = useContext(DropdownContext)
  const shouldClose = closeOnSelectProp ?? context?.closeOnSelect ?? true
  const itemClassName = `${styles.item} ${danger ? styles.itemDanger : ''} ${className}`.trim()

  function handleClick(event) {
    onClick?.(event)

    if (!event.defaultPrevented && shouldClose) {
      context?.closeDropdown?.()
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={itemClassName}
      onClick={handleClick}
      {...props}
    >
      <span className={styles.itemLabel}>{children}</span>
      {description ? <span className={styles.itemDescription}>{description}</span> : null}
    </button>
  )
}

AnimatedDropdown.Group = DropdownGroup
AnimatedDropdown.Divider = DropdownDivider
AnimatedDropdown.Item = DropdownItem

export default AnimatedDropdown
