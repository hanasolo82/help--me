import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell, ClipboardCheck, HeartHandshake, MessageCircle } from 'lucide-react'
import { useAuth } from '../../contexts/useAuth'
import { useChats } from '../../hooks/useChats'
import { getMyTasks, getPendingTaskApplications } from '../../services/tasksService'
import styles from './NotificationsPage.module.css'

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Alguien'
}

function formatRelativeTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Ahora mismo'
  if (minutes < 60) return `Hace ${minutes} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} ${days === 1 ? 'día' : 'días'}`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function isUnreadConversation(conversation, userId) {
  const latestMessage = conversation?.latest_message
  if (!latestMessage || latestMessage.sender_id === userId) return false

  const participant = conversation?.participants?.find((item) => item.user_id === userId)
  const lastReadAt = participant?.last_read_at
  if (!lastReadAt) return true

  return new Date(latestMessage.created_at || 0).getTime() > new Date(lastReadAt).getTime()
}

// Feed de notificaciones. Hoy se deriva en vivo de los datos reales que ya
// existen (mensajes sin leer, helpers interesados, ofertas por confirmar).
// TODO(backend): cuando exista una tabla de eventos (notifications), añadir
// aquí pagos, valoraciones recibidas y nuevas solicitudes cercanas — sin
// tabla no hay histórico ni "visto", y no inventamos datos.
export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { chats } = useChats()

  const myTasksQuery = useQuery({
    queryKey: ['my-tasks', profile?.id],
    queryFn: () => getMyTasks(profile?.id),
    enabled: Boolean(profile?.id),
    staleTime: 15_000,
  })

  const openTaskIds = useMemo(
    () => (myTasksQuery.data || []).filter((task) => task.status === 'open').map((task) => task.id),
    [myTasksQuery.data],
  )

  const applicationsQuery = useQuery({
    queryKey: ['pending-task-applications', profile?.id, openTaskIds],
    queryFn: () => getPendingTaskApplications(openTaskIds),
    enabled: Boolean(profile?.id) && openTaskIds.length > 0,
    staleTime: 10_000,
  })

  const items = useMemo(() => {
    const tasksById = new Map((myTasksQuery.data || []).map((task) => [task.id, task]))
    const feed = []

    for (const conversation of chats || []) {
      if (!isUnreadConversation(conversation, user?.id)) continue

      const senderName = getDisplayName(conversation.other_user)
      feed.push({
        id: `message-${conversation.id}`,
        Icon: MessageCircle,
        title: `Nuevo mensaje de ${senderName}`,
        body: conversation.latest_message?.deleted_at
          ? 'Mensaje eliminado'
          : conversation.latest_message?.body || 'Abre la conversación para leerlo.',
        at: conversation.latest_message?.created_at || conversation.last_message_at,
        actionLabel: 'Abrir chat',
        onAction: () => navigate('/messages', { state: { conversationId: conversation.id } }),
      })
    }

    for (const application of applicationsQuery.data || []) {
      const task = tasksById.get(application.task_id)
      if (!task) continue

      const helperName = getDisplayName(application.helper_profile)
      feed.push({
        id: `application-${application.id}`,
        Icon: HeartHandshake,
        title: `${helperName} se ha ofrecido a ayudarte`,
        body: `Revisa las personas interesadas en «${task.title}».`,
        at: application.created_at,
        actionLabel: 'Ver interesados',
        onAction: () => navigate(`/task/${task.id}`, { state: { returnTo: '/notifications' } }),
      })
    }

    for (const task of myTasksQuery.data || []) {
      if (task.status !== 'assigned') continue

      const helperName = getDisplayName(task.accepted_profile)
      feed.push({
        id: `confirm-${task.id}`,
        Icon: ClipboardCheck,
        title: `${helperName} está listo para «${task.title}»`,
        body: 'Decide si confirmas y pagas, o rechazas esta oferta.',
        at: task.updated_at || task.created_at,
        actionLabel: 'Decidir ahora',
        onAction: () => navigate(`/task/${task.id}`, { state: { returnTo: '/notifications' } }),
      })
    }

    return feed.sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime())
  }, [applicationsQuery.data, chats, myTasksQuery.data, navigate, user?.id])

  return (
    <main className={`app-screen with-nav ${styles.page}`}>
      <header className="page-header">
        <button type="button" className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
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
          <button type="button" className="secondary-action" onClick={() => navigate('/settings#notificaciones')}>
            Preferencias de notificación
          </button>
        </section>
      ) : (
        <ul className={styles.feed}>
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.item} onClick={item.onAction}>
                <span className={styles.itemIcon} aria-hidden="true">
                  <item.Icon strokeWidth={1.8} />
                </span>
                <span className={styles.itemCopy}>
                  <span className={styles.itemTop}>
                    <strong>{item.title}</strong>
                    {item.at ? <time dateTime={item.at}>{formatRelativeTime(item.at)}</time> : null}
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
