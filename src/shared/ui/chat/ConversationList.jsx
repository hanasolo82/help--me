import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'
import styles from './ConversationList.module.css'

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

export default function ConversationList({ conversations = [], currentConversationId, onSelectConversation }) {
  if (conversations.length === 0) {
    return null
  }

  return (
    <ul className={styles.list}>
      {conversations.map((conversation) => {
        const counterpart = conversation.other_user
        const name = getDisplayName(counterpart)
        const initial = name.charAt(0).toUpperCase()
        const preview = conversation.latest_message?.deleted_at
          ? 'Mensaje eliminado'
          : conversation.latest_message?.body || 'Sin mensajes todavia'

        return (
          <li key={conversation.id}>
            <button
              type="button"
              className={styles.item}
              aria-current={currentConversationId === conversation.id ? 'page' : undefined}
              onClick={() => onSelectConversation?.(conversation)}
            >
              <span className={styles.avatar}>{initial}</span>
              <span>
                <strong>{name}</strong>
                <p>
                  {preview}
                  {conversation.last_message_at ? ` · ${formatMessageTimestamp(conversation.last_message_at)}` : ''}
                </p>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
