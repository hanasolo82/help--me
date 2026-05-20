import styles from './HomeLayout.module.css'

export default function HomeLayout({ wide = false, header, switcher, children }) {
  return (
    <main className={`${styles.shell} ${wide ? styles.wide : ''}`.trim()}>
      {header}
      {switcher}
      <div className={styles.content}>{children}</div>
    </main>
  )
}
