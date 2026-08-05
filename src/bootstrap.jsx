import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Analytics } from '@vercel/analytics/react'

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

const app = (
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Analytics />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
)

const root = document.getElementById('root')
const normalizedPath = window.location.pathname.length > 1
  ? window.location.pathname.replace(/\/+$/, '')
  : '/'
const prerenderedPaths = new Set(['/', '/legal/privacy', '/legal/terms'])
const shouldHydrate = root.dataset.prerendered === 'true' && prerenderedPaths.has(normalizedPath)

// Las rutas publicas conservan el HTML generado en build. El resto de rutas
// usa montaje cliente normal porque recibe el index como fallback de la SPA.
if (shouldHydrate) {
  hydrateRoot(root, app)
} else {
  createRoot(root).render(app)
}
