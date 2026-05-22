import styles from './HomeLayout.module.css'
import Particles from '@/components/ui/particles'

export default function HomeLayout({ wide = false, header, switcher, children }) {
  return (
    <main className={`${styles.shell} ${wide ? styles.wide : ''}`.trim()}>
      <Particles className={styles.particlesLayer} />
      {header}
      {switcher}
      <div className={styles.content}>{children}</div>
    </main>
  )
}
