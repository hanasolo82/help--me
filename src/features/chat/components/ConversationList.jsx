import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'

function getDisplayName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

export default function ConversationList({ conversations = [], currentConversationId, onSelectConversation }) {
  if (conversations.length === 0) {
    return null
  }

  return (
    <ul className="chat-list">
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
              className="chat-list-item"
              aria-current={currentConversationId === conversation.id ? 'page' : undefined}
              onClick={() => onSelectConversation?.(conversation)}
            >
              <span className="avatar-small">{initial}</span>
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
