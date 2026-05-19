import { scan } from 'react-scan'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'
import 'leaflet/dist/leaflet.css'
import './styles.css'
if (import.meta.env.DEV) {
  scan()
}
const queryClient = new QueryClient()

// Punto de entrada: monta React, activa rutas SPA y carga estilos globales/Leaflet.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
