import { createContext } from 'react'

// Contexto base separado para que Fast Refresh no mezcle componentes y hooks en el mismo archivo.
export const AuthContext = createContext(null)
