export function isTerminalTaskChatStatus(status) {
  return status === 'completed' || status === 'closed'
}

export function isTaskConversationReadOnly(conversation) {
  return conversation?.conversation_type === 'task'
    && isTerminalTaskChatStatus(conversation?.task?.status)
}
