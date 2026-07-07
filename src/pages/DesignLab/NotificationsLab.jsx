import { Bell, ClipboardCheck, HeartHandshake, MessageCircle } from 'lucide-react'
import styles from '../Notifications/NotificationsPage.module.css'

// Lab dev-only: reproduce el markup real de NotificationsPage (mismo CSS module)
// con datos mock, para verificar ancho/centrado y el hueco título↔lista sin
// necesitar sesión. No existe en producción.
const MOCK_ITEMS = [
  {
    id: '1',
    Icon: HeartHandshake,
    title: 'Marta se ha ofrecido para tu solicitud',
    body: 'Revisa su perfil y decide si quieres asignarle "Montar una estantería".',
    at: '2026-07-07T09:10:00.000Z',
    actionLabel: 'Ver interesados',
  },
  {
    id: '2',
    Icon: MessageCircle,
    title: 'Nuevo mensaje de Javier',
    body: '"Perfecto, puedo pasarme mañana por la mañana si te viene bien."',
    at: '2026-07-06T18:40:00.000Z',
    actionLabel: 'Abrir chat',
  },
  {
    id: '3',
    Icon: ClipboardCheck,
    title: 'Oferta pendiente de confirmar',
    body: 'Tienes una oferta lista para "Pasear al perro" a la espera de tu decisión.',
    at: '2026-07-05T12:00:00.000Z',
    actionLabel: 'Decidir ahora',
  },
]

function NotificationsView({ items }) {
  return (
    <main className={`app-screen with-nav ${styles.page}`}>
      <header className="page-header">
        <button type="button" className="icon-button" aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Notificaciones</p>
          <h1>Lo último de tu actividad</h1>
          <p className="muted">Respuestas a tus solicitudes, mensajes y ofertas pendientes de decidir.</p>
        </div>
      </header>

      {items.length === 0 ? (
        <section className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <Bell strokeWidth={1.6} />
          </span>
          <h2>Estás al día</h2>
          <p className="muted">
            Cuando alguien responda a tus solicitudes, te escriba o haya una oferta que decidir, lo verás aquí.
          </p>
          <button type="button" className="secondary-action">
            Preferencias de notificación
          </button>
        </section>
      ) : (
        <ul className={styles.feed}>
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.item}>
                <span className={styles.itemIcon} aria-hidden="true">
                  <item.Icon strokeWidth={1.8} />
                </span>
                <span className={styles.itemCopy}>
                  <span className={styles.itemTop}>
                    <strong>{item.title}</strong>
                    <time dateTime={item.at}>hace 1 h</time>
                  </span>
                  <span className={styles.itemBody}>{item.body}</span>
                  <span className={styles.itemAction}>{item.actionLabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default function NotificationsLab() {
  return (
    <>
      <NotificationsView items={MOCK_ITEMS} />
      <NotificationsView items={[]} />
    </>
  )
}
