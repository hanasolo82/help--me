import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'

export default function MessageBubble({
  message,
  isOwn = false,
  onEdit,
  onDelete,
  onRetry,
}) {
  const isTemporary = Boolean(message.optimisticStatus) || String(message.id || '').startsWith('temp-')
  const isDeleted = Boolean(message.deleted_at)
  const isSending = message.optimisticStatus === 'sending'
  const isFailed = message.optimisticStatus === 'failed'
  const isEdited = Boolean(message.edited_at && !message.deleted_at)

  return (
    <article className={`message ${isOwn ? 'outgoing' : 'incoming'}`} data-status={message.optimisticStatus || 'sent'}>
      <div className="message-header">
        {isOwn && !isDeleted && !isTemporary && (
          <div className="message-actions">
            {onEdit && (
              <button type="button" className="message-action-link icon" onClick={() => onEdit(message)} aria-label="Editar mensaje" title="Editar mensaje">
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" className="message-action-link icon" onClick={() => onDelete(message)} aria-label="Borrar mensaje" title="Borrar mensaje">
                x
              </button>
            )}
          </div>
        )}
        {isOwn && isTemporary && isSending && (
          <span className="message-edited">pendiente</span>
        )}
      </div>

      {isDeleted ? (
        <span className="message-content muted">Mensaje eliminado</span>
      ) : (
        <span className="message-content">{message.body || message.content}</span>
      )}

      <div className="message-footer">
        <time className="message-meta" dateTime={message.created_at}>
          {formatMessageTimestamp(message.created_at)}
        </time>
        {isEdited && <span className="message-edited">editado</span>}
        {isSending && <span className="message-edited">enviando</span>}
        {isFailed && onRetry && (
          <button type="button" className="message-action-link primary" onClick={() => onRetry(message)}>
            Reintentar
          </button>
        )}
      </div>
    </article>
  )
}
