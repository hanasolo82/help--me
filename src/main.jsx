import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import 'leaflet/dist/leaflet.css'
import './styles.css'

// Punto de entrada: monta React, activa rutas SPA y carga estilos globales/Leaflet.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
