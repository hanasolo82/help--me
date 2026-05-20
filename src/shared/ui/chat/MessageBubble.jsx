import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'
import styles from './MessageBubble.module.css'

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
    <article className={`${styles.message} ${isOwn ? styles.outgoing : styles.incoming}`.trim()} data-status={message.optimisticStatus || 'sent'}>
      <div className={styles.header}>
        {isOwn && !isDeleted && !isTemporary && (
          <div className={styles.actions}>
            {onEdit && (
              <button type="button" className={styles.actionLink} onClick={() => onEdit(message)} aria-label="Editar mensaje" title="Editar mensaje">
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" className={styles.actionLink} onClick={() => onDelete(message)} aria-label="Borrar mensaje" title="Borrar mensaje">
                x
              </button>
            )}
          </div>
        )}
        {isOwn && isTemporary && isSending && <span className={styles.badge}>pendiente</span>}
      </div>

      {isDeleted ? (
        <span className={`${styles.content} ${styles.mutedContent}`.trim()}>Mensaje eliminado</span>
      ) : (
        <span className={styles.content}>{message.body || message.content}</span>
      )}

      <div className={styles.footer}>
        <time className={styles.meta} dateTime={message.created_at}>
          {formatMessageTimestamp(message.created_at)}
        </time>
        {isEdited && <span className={styles.badge}>editado</span>}
        {isSending && <span className={styles.badge}>enviando</span>}
        {isFailed && onRetry && (
          <button type="button" className={styles.errorAction} onClick={() => onRetry(message)}>
            Reintentar
          </button>
        )}
      </div>
    </article>
  )
}
