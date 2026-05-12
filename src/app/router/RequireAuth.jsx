import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentUser } from '../../services/authService'
import { isSupabaseConfigured } from '../../lib/supabaseClient'

export default function RequireAuth({ children }) {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    let isMounted = true

    async function checkAuth() {
      if (!isSupabaseConfigured) {
        setStatus('missing-config')
        return
      }

      const user = await getCurrentUser()

      if (isMounted) {
        setStatus(user ? 'authenticated' : 'anonymous')
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Seguridad</p>
          <h1>Comprobando sesion</h1>
          <p className="muted">Validando tu usuario con Supabase Auth.</p>
        </section>
      </main>
    )
  }

  if (status === 'missing-config' || status === 'anonymous') {
    return <Navigate to="/" replace />
  }

  return children
}
