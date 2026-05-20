import { create } from 'zustand'

const initialState = {
  showChatsModal: false,
  showSettingsModal: false,
  showTaskChatModal: false,
  activeTaskChat: null,
  expandedTaskIds: {},
  publishingTaskId: null,
}

export const useHomeUiStore = create((set) => ({
  ...initialState,
  openChatsModal: () =>
    set({
      showChatsModal: true,
      showSettingsModal: false,
      showTaskChatModal: false,
      activeTaskChat: null,
    }),
  closeChatsModal: () => set({ showChatsModal: false }),
  openSettingsModal: () =>
    set({
      showChatsModal: false,
      showSettingsModal: true,
      showTaskChatModal: false,
      activeTaskChat: null,
    }),
  openTaskChat: (task) =>
    set({
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
