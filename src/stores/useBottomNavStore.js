import { create } from 'zustand'

export const useBottomNavStore = create((set) => ({
  onOpenMap: null,
  onOpenMessages: null,
  onOpenSettings: null,
  setActions: ({ onOpenMap = null, onOpenMessages = null, onOpenSettings = null }) =>
    set({
      onOpenMap,
      onOpenMessages,
      onOpenSettings,
    }),
  clearActions: () =>
    set({
      onOpenMap: null,
      onOpenMessages: null,
      onOpenSettings: null,
    }),
}))
