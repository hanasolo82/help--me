import { forwardRef } from 'react'
import styles from './Card.module.css'

const PADDING_CLASS = {
  md: styles.paddingMd,
  lg: styles.paddingLg,
  none: '',
}

/**
 * Superficie estándar de la app (borde + radio + sombra de los tokens --hm-card-*).
 *
 * - `as`: elemento semántico a renderizar ('div', 'article', 'section', 'button'…).
 * - `variant`: 'default' | 'muted' (fondo secundario, sin sombra).
 * - `padding`: 'md' | 'lg' | 'none'.
 * - `interactive`: hover/focus con elevación; úsalo cuando la card sea clicable.
 */
const Card = forwardRef(function Card(
  { as: Tag = 'div', variant = 'default', padding = 'md', interactive = false, className = '', children, ...props },
  ref,
) {
  const classes = [
    styles.card,
    variant === 'muted' ? styles.muted : '',
    PADDING_CLASS[padding] ?? PADDING_CLASS.md,
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag ref={ref} className={classes} {...props}>
      {children}
    </Tag>
  )
})

export default Card
