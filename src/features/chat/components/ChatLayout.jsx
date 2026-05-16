export default function ChatLayout({ header, sidebar, children }) {
  return (
    <main className="app-screen with-nav">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(16rem, 22rem) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
        {sidebar ? <aside>{sidebar}</aside> : null}
        <section className="chat-screen">
          {header}
          {children}
        </section>
      </div>
    </main>
  )
}
