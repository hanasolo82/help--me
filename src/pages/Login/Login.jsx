import { useLocation } from 'react-router-dom'
import AuthPanel from '../../shared/components/AuthPanel/AuthPanel'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'

// Pagina /login: util como fallback directo y para callbacks OAuth. La landing usa AuthModal.
export default function Login() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialMode = params.get('mode') === 'register' ? 'register' : 'login'
  const missingConfig = location.state?.reason === 'missing-config'
  const accountDeactivated = location.state?.reason === 'account-deactivated'

  useDocumentMeta({
    title: initialMode === 'register' ? 'Crea tu cuenta' : 'Entrar',
    description:
      'Accede a helpMe con Google o con email y contrasena para publicar tareas o ayudar a tus vecinos.',
    path: '/login',
  })

  return (
    <main className="auth-screen">
      {missingConfig && (
        <section className="auth-panel auth-warning">
          <p className="eyebrow">Configuracion</p>
          <p className="muted">Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.</p>
        </section>
      )}
      {accountDeactivated && (
        <section className="auth-panel auth-warning">
          <p className="eyebrow">Cuenta dada de baja</p>
          <p className="muted">Tu profile se ha marcado como no disponible y la sesion se ha cerrado.</p>
        </section>
      )}
      <AuthPanel key={initialMode} titleId="login-title" initialMode={initialMode} />
    </main>
  )
}
