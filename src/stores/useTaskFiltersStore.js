import { create } from 'zustand'

const initialState = {
  mode: 'help',
  category: 'Todas',
  radius: 10,
}

export const useTaskFiltersStore = create((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode: mode === 'need' ? 'need' : 'help' }),
  setCategory: (category) => set({ category }),
  setRadius: (radius) => set({ radius: Number(radius) || 10 }),
}))

