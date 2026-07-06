import styles from './HandshakeIcon.module.css'

// Icono de inicio (splash): apretón de manos outline minimalista que se dibuja
// solo (stroke-dashoffset). El trazo usa currentColor con fallback al color de
// texto del tema, así funciona en claro/oscuro sin variantes. Decorativo por
// defecto (aria-hidden); pasa `label` si debe anunciarse a lectores de pantalla.
export default function HandshakeIcon({ size = 160, className = '', label = '' }) {
  return (
    <svg
      className={[styles.icon, className].filter(Boolean).join(' ')}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {/* Brazos y agarre */}
      <path className={styles.stroke} d="M18 50 L38 70 Q43 75 49 70 L52 67 Q58 72 64 67 L84 47" />
      {/* Dedos, con entrada escalonada */}
      <path className={`${styles.stroke} ${styles.finger1}`} d="M30 62 L46 76" />
      <path className={`${styles.stroke} ${styles.finger2}`} d="M40 55 L54 68" />
      <path className={`${styles.stroke} ${styles.finger3}`} d="M50 50 L62 62" />
    </svg>
  )
}
