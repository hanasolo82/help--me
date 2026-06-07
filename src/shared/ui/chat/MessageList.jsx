import MessageBubble from './MessageBubble'
import EmptyChatState from './EmptyChatState'
import styles from './MessageList.module.css'

export default function MessageList({
  messages = [],
  currentUserId,
  onEditMessage,
  onDeleteMessage,
  onRetryMessage,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}) {
  return (
    <>
      {hasMore && (
        <div className={styles.loadMore}>
          <button type="button" className="secondary-action" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Cargando...' : 'Cargar mensajes antiguos'}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <EmptyChatState />
      ) : (
        <div className={styles.list}>
          {messages.map((message) => (
            <MessageBubble
              key={message.client_temp_id || message.id}
              message={message}
              isOwn={message.sender_id === currentUserId}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onRetry={onRetryMessage}
            />
          ))}
        </div>
      )}
    </>
  )
}
