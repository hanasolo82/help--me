import { useId } from 'react'

import blackLogo from '../../../assets/icons/helpme_logo_black.png'
import styles from './AnimatedBrandLogo.module.css'

// Version animada e inline del logo. La coreografia usa trazos vectoriales
// temporales, pero el estado final recorta el asset original para conservar
// exactamente la fuente y la M oficiales.
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

      <g className={styles.motionMark} aria-hidden="true">
        <g className={styles.leftHand}>
          <path className={styles.armLeft} d="M342 158V68c0-31 38-42 60-20l37 38" />
          {/* Mano abierta durante la aproximación: dedos + pulgar; se cierra al agarrar */}
          <g className={styles.reach}>
            <path d="M436 80l15-4" />
            <path d="M439 86h14" />
            <path d="M436 92l13 4" />
            <path d="M421 82l9-11" />
          </g>
          <path className={styles.clasp} d="M389 93l33-33c5-5 13-5 18 0l13 13-39 39" />
          <path className={styles.cuff} d="M374 80l20 20" />
        </g>

        <g className={styles.rightHand}>
          <path className={styles.armRight} d="M480 158V68c0-31-38-42-60-20l-37 38" />
          <g className={styles.reach}>
            <path d="M386 80l-15-4" />
            <path d="M383 86h-14" />
            <path d="M386 92l-13 4" />
            <path d="M401 82l-9-11" />
          </g>
          <path className={styles.clasp} d="M434 93l-33-33c-5-5-13-5-18 0l-13 13 39 39" />
          <path className={styles.cuff} d="M449 80l-20 20" />
        </g>

        <path className={styles.finger} d="M411 100l22 22" />
        <path className={styles.finger} d="M400 111l19 19" />
        <path className={styles.finger} d="M426 96l16 16" />
        <path className={styles.finger} d="M436 107l-14 14" />
      </g>

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
