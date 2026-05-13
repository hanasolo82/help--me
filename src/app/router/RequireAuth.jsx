import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'

// Guardia de rutas privadas:
// - sin sesion => /login
// - con sesion pero sin profile => /onboarding
// - con sesion y profile => pantalla privada
export default function RequireAuth({ children, requireProfile = true }) {
  const { isConfigured, user, profile, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Seguridad</p>
          <h1>Comprobando sesion</h1>
          <p className="muted">Validando Supabase Auth y tu profile.</p>
        </section>
      </main>
    )
  }

  if (!isConfigured) {
    return <Navigate to="/login" replace state={{ from: location, reason: 'missing-config' }} />
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (requireProfile && !profile) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}
