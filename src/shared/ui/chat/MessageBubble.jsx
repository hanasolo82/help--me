import { useState } from 'react'
import { formatMessageTimestamp } from '../../../utils/formatMessageTimestamp'
import UserAvatar from '../UserAvatar'
import styles from './MessageBubble.module.css'

// Contrato con el padre (igual que MessagesThread/TaskChatModal):
//   onEdit(messageId, nextContent) · onDelete(messageId)
// OJO: antes este componente emitía onEdit(message)/onDelete(message) con el
// objeto entero — el padre recibía el mensaje como "id" y undefined como
// contenido, y el API fallaba con "mensaje vacío" / "no confirmado" (isUuid
// sobre un objeto). Editar entra en modo edición inline; nunca valida el
// composer principal.
export default function MessageBubble({
  message,
  isOwn = false,
  onEdit,
  onDelete,
  onRetry,
  counterpartName = '',
  counterpartAvatarUrl = '',
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)

  const isTemporary = Boolean(message.optimisticStatus) || String(message.id || '').startsWith('temp-')
  const isDeleted = Boolean(message.deleted_at)
  const isSending = message.optimisticStatus === 'sending'
  const isFailed = message.optimisticStatus === 'failed'
  const isEdited = Boolean(message.edited_at && !message.deleted_at)

  function startEditing() {
    setActionError('')
    setEditValue(message.body || message.content || '')
    setIsEditing(true)
  }

  function cancelEditing() {
    setActionError('')
    setIsEditing(false)
  }

  async function saveEdit() {
    const nextContent = editValue.trim()
    if (!nextContent || busy) return

    setBusy(true)
    setActionError('')
    try {
      await onEdit?.(message.id, nextContent)
      setIsEditing(false)
    } catch (editError) {
      setActionError(editError?.message || 'No se pudo editar el mensaje.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (busy) return

    setBusy(true)
    setActionError('')
    try {
      await onDelete?.(message.id)
    } catch (deleteError) {
      setActionError(deleteError?.message || 'No se pudo borrar el mensaje.')
      setBusy(false)
    }
  }

  const bubble = (
    <article className={`${styles.message} ${isOwn ? styles.outgoing : styles.incoming}`.trim()} data-status={message.optimisticStatus || 'sent'}>
      <div className={styles.header}>
        {isOwn && !isDeleted && !isTemporary && !isEditing && (
          <div className={styles.actions}>
            {onEdit && (
              <button type="button" className={styles.actionLink} onClick={startEditing} disabled={busy} aria-label="Editar mensaje" title="Editar mensaje">
                Editar
              </button>
            )}
            {onDelete && (
              <button type="button" className={styles.iconAction} onClick={handleDelete} disabled={busy} aria-label="Borrar mensaje" title="Borrar mensaje">
                ×
              </button>
            )}
          </div>
        )}
        {isOwn && isTemporary && isSending && <span className={styles.statusText}>pendiente</span>}
      </div>

      {isDeleted ? (
        <span className={styles.deletedContent}>Mensaje eliminado</span>
      ) : isEditing ? (
        <div className={styles.editForm}>
          <textarea
            className={styles.editTextarea}
            value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
            rows={2}
            maxLength={2000}
            disabled={busy}
            aria-label="Editar mensaje"
            /* Mismo patrón que el composer: Enter guarda, Shift+Enter salto, Escape cancela. */
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                saveEdit()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                cancelEditing()
              }
            }}
            autoFocus
          />
          <div className={styles.editActions}>
            <button type="button" className={styles.actionLink} onClick={cancelEditing} disabled={busy}>
              Cancelar
            </button>
            <button type="button" className={styles.saveAction} onClick={saveEdit} disabled={busy || !editValue.trim()}>
              {busy ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <span className={styles.content}>{message.body || message.content}</span>
      )}

      {actionError ? (
        <p className={styles.errorText} role="alert">
          {actionError}
        </p>
      ) : null}

      <div className={styles.footer}>
        <time className={styles.meta} dateTime={message.created_at}>
          {formatMessageTimestamp(message.created_at)}
        </time>
        {isEdited && <span className={styles.statusText}>editado</span>}
        {isSending && <span className={styles.statusText}>enviando</span>}
        {isFailed && onRetry && (
          <button type="button" className={styles.errorAction} onClick={() => onRetry(message)}>
            Reintentar
          </button>
        )}
      </div>
    </article>
  )

  // Mensajes entrantes con avatar pequeño del remitente (chat 1-a-1: identidad
  // por posición + avatar, sin nombre por mensaje). Decorativo: alt vacío, el
  // header del chat ya identifica a la persona.
  if (!isOwn && (counterpartAvatarUrl || counterpartName)) {
    return (
      <div className={styles.incomingRow}>
        <UserAvatar
          src={counterpartAvatarUrl}
          name={counterpartName || 'V'}
          alt=""
          size="xs"
          className={styles.rowAvatar}
        />
        {bubble}
      </div>
    )
  }

  return bubble
}
