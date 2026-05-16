import MessageBubble from './MessageBubble'
import EmptyChatState from './EmptyChatState'

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
        <div className="center-screen" style={{ padding: '4px 0 8px' }}>
          <button type="button" className="secondary-action" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Cargando...' : 'Cargar mensajes antiguos'}
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <EmptyChatState />
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onRetry={onRetryMessage}
          />
        ))
      )}
    </>
  )
}
