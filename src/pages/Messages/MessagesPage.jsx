import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { useChats } from '../../hooks/useChats'
import { getTasksSummaryByIds, markConversationAsRead } from '../../services/chatService'
import { formatMessageTimestamp } from '../../utils/formatMessageTimestamp'
import UserAvatar from '../../shared/ui/UserAvatar'
import MessagesThread from './MessagesThread'
import styles from './MessagesPage.module.css'

const ROLE_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'client', label: 'Como cliente' },
  { id: 'helper', label: 'Como ayudante' },
]

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

function isUnreadConversation(conversation, userId) {
  const latestMessage = conversation?.latest_message
  if (!latestMessage || latestMessage.sender_id === userId) return false

  const participant = conversation?.participants?.find((item) => item.user_id === userId)
  const lastReadAt = participant?.last_read_at
  if (!lastReadAt) return true

  return new Date(latestMessage.created_at || 0).getTime() > new Date(lastReadAt).getTime()
}

function getConversationRole(conversation, userId) {
  const task = conversation?.task
  if (!task || !userId) return null
  if (task.created_by === userId) return 'client'
  return 'helper'
}

// Página de Mensajes: lista de conversaciones a la izquierda y el hilo a la
// derecha (patrón Gmail/WhatsApp Web). En móvil, lista → detalle.
export default function MessagesPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { chats, isLoading, error } = useChats()
  const [search, setSearch] = useState('')
  const [roleTab, setRoleTab] = useState('all')
  const [selectedId, setSelectedId] = useState(() => location.state?.conversationId || null)
  // En móvil solo se ve un panel: la lista, o el hilo si hay selección explícita.
  const [mobileThreadOpen, setMobileThreadOpen] = useState(() => Boolean(location.state?.conversationId))

  const taskIds = useMemo(() => chats.map((chat) => chat.task_id).filter(Boolean), [chats])
  const tasksQuery = useQuery({
    queryKey: ['conversation-tasks', taskIds],
    queryFn: () => getTasksSummaryByIds(taskIds),
    enabled: taskIds.length > 0,
    staleTime: 60_000,
  })

  const conversations = useMemo(() => {
    const tasksById = new Map((tasksQuery.data || []).map((task) => [task.id, task]))

    return chats.map((chat) => {
      const task = chat.task || tasksById.get(chat.task_id) || null
      return {
        ...chat,
        task,
        role: getConversationRole({ ...chat, task }, user?.id),
        unread: isUnreadConversation(chat, user?.id),
      }
    })
  }, [chats, tasksQuery.data, user?.id])

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return conversations.filter((conversation) => {
      if (roleTab !== 'all' && conversation.role !== roleTab) return false
      if (!query) return true

      const name = getDisplayName(conversation.other_user).toLowerCase()
      const taskTitle = String(conversation.task?.title || '').toLowerCase()
      return name.includes(query) || taskTitle.includes(query)
    })
  }, [conversations, roleTab, search])

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) || null,
    [conversations, selectedId],
  )

  // Selección por defecto en escritorio: la primera conversación de la lista.
  // Ajuste de estado durante el render (patrón derivado-de-props de React).
  const isNarrowViewport =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 759px)').matches
  if (!selectedId && filteredConversations.length > 0 && !isNarrowViewport) {
    setSelectedId(filteredConversations[0].id)
  }

  async function handleSelect(conversation) {
    setSelectedId(conversation.id)
    setMobileThreadOpen(true)

    if (conversation.unread) {
      try {
        await markConversationAsRead(conversation.id)
        queryClient.invalidateQueries({ queryKey: ['chats'] })
      } catch {
        // Marcar como leído es best-effort: no bloquea abrir el hilo.
      }
    }
  }

  const showEmpty = !isLoading && !error && conversations.length === 0

  return (
    <main className={`app-screen with-nav ${styles.page}`}>
      <header className="page-header">
        <button type="button" className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Mensajes</p>
          <h1>Tus conversaciones</h1>
        </div>
      </header>

      {error ? (
        <p className="auth-message error" role="alert">
          {error}
        </p>
      ) : null}

      <div className={`${styles.split} ${mobileThreadOpen ? styles.splitThreadOpen : ''}`.trim()}>
        <section className={styles.listPane} aria-label="Lista de conversaciones">
          <div className={styles.listTools}>
            <input
              type="search"
              className={styles.search}
              placeholder="Buscar por nombre o tarea"
              aria-label="Buscar conversaciones"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className={styles.roleTabs} role="tablist" aria-label="Filtrar conversaciones por rol">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={roleTab === tab.id}
                  className={roleTab === tab.id ? `${styles.roleTab} ${styles.roleTabActive}` : styles.roleTab}
                  onClick={() => setRoleTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? <p className={`muted ${styles.listNotice}`}>Cargando conversaciones...</p> : null}

          {showEmpty ? (
            <div className={styles.listNotice}>
              <h3>Todavía no tienes conversaciones</h3>
              <p className="muted">Cuando escribas con alguien sobre una tarea, aparecerá aquí.</p>
            </div>
          ) : null}

          {!isLoading && conversations.length > 0 && filteredConversations.length === 0 ? (
            <p className={`muted ${styles.listNotice}`}>Nada que coincida con ese filtro.</p>
          ) : null}

          <ul className={styles.rows}>
            {filteredConversations.map((conversation) => {
              const name = getDisplayName(conversation.other_user)
              const preview = conversation.latest_message?.deleted_at
                ? 'Mensaje eliminado'
                : conversation.latest_message?.body || 'Sin mensajes todavía'

              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    className={
                      conversation.id === selectedId ? `${styles.row} ${styles.rowActive}` : styles.row
                    }
                    onClick={() => handleSelect(conversation)}
                  >
                    <UserAvatar
                      src={conversation.other_user?.avatar_url}
                      name={name}
                      alt={name}
                      size="sm"
                      className={styles.rowAvatar}
                    />
                    <span className={styles.rowCopy}>
                      <span className={styles.rowTop}>
                        <strong>{name}</strong>
                        {conversation.last_message_at ? (
                          <time dateTime={conversation.last_message_at}>
                            {formatMessageTimestamp(conversation.last_message_at)}
                          </time>
                        ) : null}
                      </span>
                      <span className={conversation.unread ? `${styles.rowPreview} ${styles.rowPreviewUnread}` : styles.rowPreview}>
                        {preview}
                      </span>
                      {conversation.task?.title ? (
                        <span className={styles.rowTask}>{conversation.task.title}</span>
                      ) : null}
                    </span>
                    {conversation.unread ? <span className={styles.unreadDot} aria-label="Mensajes sin leer" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className={styles.threadPane}>
          {selectedConversation ? (
            <MessagesThread
              key={selectedConversation.id}
              conversation={selectedConversation}
              onBack={() => setMobileThreadOpen(false)}
              onOpenTask={(taskId) => navigate(`/task/${taskId}`, { state: { returnTo: '/messages' } })}
            />
          ) : (
            <div className={styles.threadEmpty}>
              <p className="eyebrow">Mensajes</p>
              <h2>Elige una conversación</h2>
              <p className="muted">Selecciona un chat de la lista para leerlo y responder desde aquí.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
