import { useHomeUiStore } from '../../../stores/useHomeUiStore'

export function useHomeModals() {
  const {
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  } = useHomeUiStore()

  return {
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  }
}
