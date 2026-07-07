import HomeLayout from '../../shared/ui/layouts/HomeLayout'
import homeStyles from '../../features/helper-home/styles/helperHome.module.css'

// Lab dev-only: reproduce la cadena real shell > content > .home > .mapWorkspace
// (mismos CSS modules) con un panel derecho de contenido alto, para medir si el
// workspace desborda el viewport y si el scroll interno del panel funciona.
// No existe en producción.
export default function HomeHeightLab() {
  return (
    <HomeLayout
      wide
      header={
        <header style={{ minHeight: '103px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p className="muted">Header simulado (~103px)</p>
        </header>
      }
    >
      <section className={homeStyles.home}>
        <section className={homeStyles.mapWorkspace} aria-label="Mapa de solicitudes activas">
          <div
            className={homeStyles.mapPane}
            style={{ background: 'color-mix(in srgb, var(--color-primary) 14%, var(--color-surface))', borderRadius: '1rem' }}
          >
            <div style={{ display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>MAPA</div>
          </div>
          <aside className={homeStyles.mapDrawer}>
            {Array.from({ length: 30 }, (_, index) => (
              <div
                key={index}
                className={homeStyles.columnPanel}
                style={{ padding: '1rem', minHeight: '3rem' }}
              >
                Tarea de ejemplo #{index + 1}
              </div>
            ))}
          </aside>
        </section>
      </section>
    </HomeLayout>
  )
}
