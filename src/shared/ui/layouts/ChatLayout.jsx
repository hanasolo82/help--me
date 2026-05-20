import styles from './ChatLayout.module.css'

export default function ChatLayout({ header, sidebar, children }) {
  return (
    <main className={`app-screen ${styles.screen}`}>
      <div className={styles.grid}>
        {sidebar ? <aside>{sidebar}</aside> : null}
        <section className="chat-screen">
          {header}
          {children}
        </section>
      </div>
    </main>
  )
}
