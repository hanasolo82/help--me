import { useHomeUiStore } from '../../../stores/useHomeUiStore'

export function useHomeModals() {
  const {
    showMap,
    showLocationPanel,
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    setShowMap,
    setShowLocationPanel,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
    closeSettingsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  } = useHomeUiStore()

  return {
    showMap,
    showLocationPanel,
    showChatsModal,
    showTaskChatModal,
    activeTaskChat,
    expandedTaskIds,
    publishingTaskId,
    setShowMap,
    setShowLocationPanel,
    openChatsModal,
    closeChatsModal,
    openSettingsModal,
    closeSettingsModal,
    openTaskChat,
    closeTaskChat,
    setPublishingTaskId,
    clearPublishingTaskId,
    toggleExpandedTask,
  }
}
