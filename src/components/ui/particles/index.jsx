import styles from './particles.module.css'

const PARTICLES = [
  { top: '10%', left: '8%', size: 10, duration: 18, delay: -2, opacity: 0.28 },
  { top: '18%', left: '72%', size: 14, duration: 22, delay: -7, opacity: 0.24 },
  { top: '28%', left: '44%', size: 8, duration: 16, delay: -4, opacity: 0.18 },
  { top: '42%', left: '14%', size: 12, duration: 20, delay: -11, opacity: 0.2 },
  { top: '52%', left: '84%', size: 16, duration: 24, delay: -8, opacity: 0.22 },
  { top: '66%', left: '26%', size: 9, duration: 19, delay: -5, opacity: 0.16 },
  { top: '74%', left: '58%', size: 13, duration: 21, delay: -13, opacity: 0.19 },
  { top: '84%', left: '16%', size: 7, duration: 17, delay: -9, opacity: 0.14 },
  { top: '86%', left: '78%', size: 11, duration: 23, delay: -15, opacity: 0.17 },
  { top: '32%', left: '88%', size: 6, duration: 15, delay: -3, opacity: 0.12 },
  { top: '58%', left: '6%', size: 15, duration: 26, delay: -10, opacity: 0.2 },
  { top: '6%', left: '50%', size: 9, duration: 19, delay: -6, opacity: 0.16 },
]

export function Particles({ className = '' }) {
  const resolvedClassName = [styles.particles, className].filter(Boolean).join(' ')

  return (
    <div className={resolvedClassName} aria-hidden="true">
      {PARTICLES.map((particle, index) => (
        <span
          key={`${particle.top}-${particle.left}-${index}`}
          className={styles.particle}
          style={{
            '--particle-top': particle.top,
            '--particle-left': particle.left,
            '--particle-size': `${particle.size}px`,
            '--particle-duration': `${particle.duration}s`,
            '--particle-delay': `${particle.delay}s`,
            '--particle-opacity': particle.opacity,
          }}
        />
      ))}
    </div>
  )
}

export default Particles
