import { useState } from 'react'
import { formatMessageTimestamp } from '../../utils/formatMessageTimestamp'
import editIcon from '../../assets/icons/svgviewer-output.svg'

export default function MessageList({
  messages,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
}) {
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [draftContent, setDraftContent] = useState('')
  const [busyMessageId, setBusyMessageId] = useState(null)
  const [localError, setLocalError] = useState('')

  function isTemporaryMessage(message) {
    return Boolean(message?.optimisticStatus) || String(message?.id || '').startsWith('temp-')
  }

  async function handleSave(messageId) {
    if (String(messageId || '').startsWith('temp-')) {
      setLocalError('No puedes editar un mensaje todavia no confirmado.')
      return
    }

    if (!draftContent.trim() || busyMessageId) {
      return
    }

    setBusyMessageId(messageId)
    setLocalError('')

    try {
      await onEditMessage(messageId, draftContent)
      setEditingMessageId(null)
      setDraftContent('')
    } catch (error) {
      setLocalError(error?.message || 'No se pudo editar el mensaje.')
    } finally {
      setBusyMessageId(null)
    }
  }

  async function handleDelete(messageId) {
    if (String(messageId || '').startsWith('temp-')) {
      setLocalError('No puedes borrar un mensaje todavia no confirmado.')
      return
    }

    if (busyMessageId) {
      return
    }

    setBusyMessageId(messageId)
    setLocalError('')

    try {
      await onDeleteMessage(messageId)
      if (editingMessageId === messageId) {
        setEditingMessageId(null)
        setDraftContent('')
      }
    } catch (error) {
      setLocalError(error?.message || 'No se pudo borrar el mensaje.')
    } finally {
      setBusyMessageId(null)
    }
  }

  return (
    <>
      {messages.length === 0 && <p className="muted">Aun no hay mensajes. Saluda para empezar.</p>}

      {messages.map((message) => {
        const isOwn = message.sender_id === currentUserId
        const isEditing = editingMessageId === message.id
        const isBusy = busyMessageId === message.id
        const isTemporary = isTemporaryMessage(message)
        const canManageMessage = isOwn && !isTemporary && !message.deleted_at
        const isEdited = message.updated_at && message.updated_at !== message.created_at

        return (
          <div
            key={message.id}
            className={isOwn ? 'message outgoing' : 'message incoming'}
          >
            {!isEditing || isTemporary ? (
              <>
                {canManageMessage && (
                  <div className="message-header">
                    <div className="message-actions">
                      <button
                        type="button"
                        className="message-action-link icon"
                        onClick={() => {
                          setEditingMessageId(message.id)
                          setDraftContent(message.body || message.content || '')
                          setLocalError('')
                        }}
                        disabled={isBusy}
                        aria-label="Editar mensaje"
                        title="Editar mensaje"
                      >
                        <img src={editIcon} alt="" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="message-action-link icon"
                        onClick={() => handleDelete(message.id)}
                        disabled={isBusy}
                        aria-label="Borrar mensaje"
                        title="Borrar mensaje"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {isOwn && isTemporary && !message.deleted_at && (
                  <div className="message-header">
                    <span className="message-edited">pendiente</span>
                  </div>
                )}

                {message.deleted_at ? (
                  <span className="message-content muted">Mensaje eliminado</span>
                ) : (
                  <span className="message-content">{message.body || message.content}</span>
                )}

                <div className="message-footer">
                  <time className="message-meta" dateTime={message.created_at}>
                    {formatMessageTimestamp(message.created_at)}
                  </time>
                  {isEdited && !message.deleted_at && <span className="message-edited">editado</span>}
                </div>
              </>
            ) : (
              <form
                className="message-edit-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleSave(message.id)
                }}
              >
                <textarea
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  maxLength={2000}
                  disabled={isBusy}
                />
                <div className="message-edit-actions">
                  <button
                    type="button"
                    className="message-action-link"
                    onClick={() => {
                      setEditingMessageId(null)
                      setDraftContent('')
                      setLocalError('')
                    }}
                    disabled={isBusy}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="message-action-link primary" disabled={isBusy || !draftContent.trim()}>
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      })}

      {localError && <p className="message-error">{localError}</p>}
    </>
  )
}
