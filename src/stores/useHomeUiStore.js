import { create } from 'zustand'

const initialState = {
  showMap: false,
  showLocationPanel: true,
  showChatsModal: false,
  showSettingsModal: false,
  showTaskChatModal: false,
  activeTaskChat: null,
  expandedTaskIds: {},
  publishingTaskId: null,
}

export const useHomeUiStore = create((set) => ({
  ...initialState,
  setShowMap: (showMap) => set({ showMap }),
  setShowLocationPanel: (showLocationPanel) => set({ showLocationPanel }),
  openChatsModal: () =>
    set({
      showMap: false,
      showLocationPanel: true,
      showChatsModal: true,
      showSettingsModal: false,
      showTaskChatModal: false,
      activeTaskChat: null,
    }),
  closeChatsModal: () => set({ showChatsModal: false }),
  openSettingsModal: () =>
    set({
      showMap: false,
      showChatsModal: false,
      showSettingsModal: true,
      showTaskChatModal: false,
      activeTaskChat: null,
    }),
  closeSettingsModal: () => set({ showSettingsModal: false }),
  openTaskChat: (task) =>
    set({
      showMap: false,
      showChatsModal: false,
      showSettingsModal: false,
      showTaskChatModal: true,
      activeTaskChat: task || null,
    }),
  closeTaskChat: () =>
    set({
      showTaskChatModal: false,
      activeTaskChat: null,
    }),
  setPublishingTaskId: (publishingTaskId) => set({ publishingTaskId }),
  clearPublishingTaskId: () => set({ publishingTaskId: null }),
  toggleExpandedTask: (taskId) =>
    set((state) => ({
      expandedTaskIds: {
        ...state.expandedTaskIds,
        [taskId]: !state.expandedTaskIds[taskId],
      },
    })),
  resetHomeUi: () => set(initialState),
}))

