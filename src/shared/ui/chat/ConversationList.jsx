import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'
import UserAvatar from '../UserAvatar'
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
              <UserAvatar src={counterpart?.avatar_url} name={name} alt={name} size="sm" className={styles.avatar} />
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
