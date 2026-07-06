import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal, { ModalBody, ModalHeader } from '../../shared/ui/Modal/Modal'
import styles from '../../pages/Home/Home.module.css'

function getChatName(chat, currentUserId) {
  const counterpartProfile =
    chat.other_user || chat.participants?.find((participant) => participant.user_id !== currentUserId)?.profile

  return (
    counterpartProfile?.display_name ||
    counterpartProfile?.full_name ||
    counterpartProfile?.username ||
    'Vecino'
  )
}

export default function ChatsModal({ open, chats, loading, error, currentUserId, onClose }) {
  const navigate = useNavigate()
  const sortedChats = useMemo(
    () =>
      [...(chats || [])].sort(
        (left, right) =>
          new Date(right.last_message_at || right.created_at || 0).getTime() -
          new Date(left.last_message_at || left.created_at || 0).getTime(),
      ),
    [chats],
  )

  return (
    <Modal open={open} onClose={onClose} className={styles.chatsPanel}>
      <ModalHeader eyebrow="Conversaciones" title="Tus chats" closeLabel="Cerrar mensajes" />

      <ModalBody>
        {loading && <p className="muted">Cargando...</p>}
        {error && <p className="auth-message error" role="alert">{error}</p>}

        {!loading && !error && sortedChats.length === 0 && (
          <article className="empty-state">
            <h3>Todavia no tienes chats</h3>
            <p>Cuando una tarea esté confirmada y el chat se desbloquee, aparecerá aquí.</p>
          </article>
        )}

        <ul className="chat-list">
          {sortedChats.map((chat) => {
            const name = getChatName(chat, currentUserId)
            const initial = name.charAt(0).toUpperCase()
            const preview = chat.latest_message?.deleted_at
              ? 'Mensaje eliminado'
              : chat.latest_message?.body || chat.latest_message?.content || 'Sin mensajes todavia'

            return (
              <li key={chat.id}>
                <button
                  type="button"
                  className="chat-list-item"
                  onClick={() => {
                    onClose()
                    if (chat.task_id) {
                      navigate(`/task/${chat.task_id}`, {
                        state: {
                          openChat: true,
                          conversationId: chat.id,
                          returnTo: '/home',
                        },
                      })
                      return
                    }

                    navigate(`/chat/${chat.id}`, { state: { returnTo: '/home' } })
                  }}
                >
                  <span className="avatar-small">{initial}</span>
                  <span>
                    <strong>{name}</strong>
                    <p>{preview}</p>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </ModalBody>
    </Modal>
  )
}
