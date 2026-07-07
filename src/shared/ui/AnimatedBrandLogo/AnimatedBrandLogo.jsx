import { useId } from 'react'

import blackLogo from '../../../assets/icons/helpme_logo_black.png'
import styles from './AnimatedBrandLogo.module.css'

// Version animada e inline del logo: la M oficial aparece primero (fade + escala
// suave) y despues entran "Help" y la "e" deslizandose. Los tres tramos son
// recortes (clipPath) del asset original, asi la fuente y la M son exactas.
const SIZE_CLASSES = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
  xl: 'xl',
}

export default function AnimatedBrandLogo({ size = 'md', className = '', label = 'helpMe' }) {
  const sizeClass = styles[SIZE_CLASSES[size] ?? 'md']
  const reactId = useId().replaceAll(':', '')
  const leftClipId = `${reactId}-clip-word-left`
  const markClipId = `${reactId}-clip-mark`
  const rightClipId = `${reactId}-clip-word-right`

  return (
    <svg
      className={[styles.logo, sizeClass, className].filter(Boolean).join(' ')}
      viewBox="0 0 578 211"
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id={leftClipId} clipPathUnits="userSpaceOnUse">
          <rect x="0" y="0" width="324" height="211" />
        </clipPath>
        <clipPath id={markClipId} clipPathUnits="userSpaceOnUse">
          <rect x="324" y="0" width="168" height="211" />
        </clipPath>
        <clipPath id={rightClipId} clipPathUnits="userSpaceOnUse">
          <rect x="492" y="0" width="86" height="211" />
        </clipPath>
      </defs>

      <image
        className={`${styles.logoSlice} ${styles.markFinal}`}
        href={blackLogo}
        x="0"
        y="0"
        width="578"
        height="211"
        clipPath={`url(#${markClipId})`}
        aria-hidden="true"
      />
      <image
        className={`${styles.logoSlice} ${styles.wordLeft}`}
        href={blackLogo}
        x="0"
        y="0"
        width="578"
        height="211"
        clipPath={`url(#${leftClipId})`}
        aria-hidden="true"
      />
      <image
        className={`${styles.logoSlice} ${styles.wordRight}`}
        href={blackLogo}
        x="0"
        y="0"
        width="578"
        height="211"
        clipPath={`url(#${rightClipId})`}
        aria-hidden="true"
      />
    </svg>
  )
}
