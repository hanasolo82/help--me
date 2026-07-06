import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'

import { router } from './app/router/AppRouter.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { queryClient } from './lib/queryClient'
import ErrorBoundary from './shared/components/ErrorBoundary.jsx'
import 'leaflet/dist/leaflet.css'
import './styles/design-tokens.css'
import './styles/theme-live.css'
import './styles/globals.css'
import './styles/view-transitions.css'
import './styles.css'

// Montaje real de React. main.jsx carga herramientas dev antes de importar este modulo.
// Data router (RouterProvider): requerido por useViewTransitionState y viewTransition.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
