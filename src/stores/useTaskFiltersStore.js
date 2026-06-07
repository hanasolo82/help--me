import { create } from 'zustand'

const initialState = {
  mode: 'help',
  category: 'Todas',
}

export const useTaskFiltersStore = create((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode: mode === 'need' ? 'need' : 'help' }),
  setCategory: (category) => set({ category }),
  reset: () => set(initialState),
}))
