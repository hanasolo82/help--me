import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { signOut } from '../../services/authService'

// Guardia de rutas privadas:
// - sin sesion => /login
// - con sesion pero sin profile => /onboarding
// - con sesion y profile => pantalla privada
export default function RequireAuth({ children, requireProfile = true }) {
  const { isConfigured, user, profile, loading, profileLoading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

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

  if (requireProfile && profile?.account_status && profile.account_status !== 'active') {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Cuenta no disponible</p>
          <h1>Tu profile esta dado de baja</h1>
          <p className="muted">
            Esta cuenta ya no puede acceder a las pantallas privadas. Tus tareas quedan conservadas, pero no visibles
            como ofertas activas.
          </p>
          <button
            className="primary-action"
            onClick={async () => {
              await signOut({ scope: 'global' })
              navigate('/', { replace: true })
            }}
          >
            Volver a home
          </button>
        </section>
      </main>
    )
  }

  return children
}
