import styles from './AnimatedBrandLogo.module.css'

const BLACK_LOGO_URL = '/logos/helpme_logo_black.png'

// Version animada e inline del logo: la M oficial aparece primero (fade + escala
// suave) y despues entran "Help" y la "e" deslizandose. Los tres tramos son
// viewports recortados del asset original, asi la fuente y la M son exactas.
const SIZE_CLASSES = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
}

export default function AnimatedBrandLogo({ size = 'md', className = '', label = 'HelpMe' }) {
  const sizeClass = styles[SIZE_CLASSES[size] ?? 'md']

  return (
    <svg
      className={[styles.logo, sizeClass, className].filter(Boolean).join(' ')}
      viewBox="0 0 578 211"
      role="img"
      aria-label={label}
    >
      <svg
        className={`${styles.logoSlice} ${styles.markFinal}`}
        x="324"
        y="0"
        width="168"
        height="211"
        viewBox="324 0 168 211"
        overflow="hidden"
        aria-hidden="true"
      >
        <image href={BLACK_LOGO_URL} x="0" y="0" width="578" height="211" />
      </svg>
      <svg
        className={`${styles.logoSlice} ${styles.wordLeft}`}
        x="0"
        y="0"
        width="324"
        height="211"
        viewBox="0 0 324 211"
        overflow="hidden"
        aria-hidden="true"
      >
        <image href={BLACK_LOGO_URL} x="0" y="0" width="578" height="211" />
      </svg>
      <svg
        className={`${styles.logoSlice} ${styles.wordRight}`}
        x="492"
        y="0"
        width="86"
        height="211"
        viewBox="492 0 86 211"
        overflow="hidden"
        aria-hidden="true"
      >
        <image href={BLACK_LOGO_URL} x="0" y="0" width="578" height="211" />
      </svg>
    </svg>
  )
}
