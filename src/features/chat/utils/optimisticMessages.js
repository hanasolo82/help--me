export function createOptimisticMessage({
  conversationId,
  senderId,
  body,
  clientTempId = `temp-${crypto.randomUUID()}`,
}) {
  const now = new Date().toISOString()

  return {
    id: clientTempId,
    client_temp_id: clientTempId,
    conversation_id: conversationId,
    sender_id: senderId,
    body,
    content: body,
    message_type: 'text',
    created_at: now,
    updated_at: now,
    edited_at: null,
    deleted_at: null,
    optimisticStatus: 'sending',
  }
}

export function markOptimisticMessageFailed(message, errorMessage = 'No se pudo enviar el mensaje.') {
  if (!message) return message

  return {
    ...message,
    optimisticStatus: 'failed',
    optimisticError: errorMessage,
  }
}

export function settleOptimisticMessage(tempId, persistedMessage) {
  return {
    tempId,
    persistedMessage,
  }
}

export function isOptimisticMessage(message) {
  return Boolean(message?.optimisticStatus)
}
