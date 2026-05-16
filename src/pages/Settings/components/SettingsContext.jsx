import { createContext, useContext } from 'react'

const SettingsContext = createContext(null)

export function SettingsProvider({ value, children }) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings debe usarse dentro de SettingsProvider.')
  }

  return context
}
