import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { sanitizeText } from '../../lib/security'
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from '../../services/authService'
import { getProfileByUserId } from '../../services/profilesService'

// Panel reutilizable para la pagina /login. Mantiene la logica en servicios, no en Supabase directo.
export function LoginPanel({ titleId, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const isRegister = mode === 'register'

  async function finishEmailAuth(authAction) {
    setStatus('loading')
    setMessage('')

    try {
      const result = await authAction({ email, password })

      if (!result.session) {
        setStatus('sent')
        setMessage('Revisa tu correo para confirmar la cuenta antes de entrar.')
        return
      }

      const nextProfile = await getProfileByUserId(result.user.id)
      await refreshProfile()
      navigate(nextProfile ? '/home' : '/onboarding', { replace: true })
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  async function handleGoogleAuth() {
    setStatus('loading')
    setMessage('')

    try {
      await signInWithGoogle()
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">helpMe Auth</p>
      <h1 id={titleId}>{isRegister ? 'Crea tu cuenta' : 'Entra en helpMe'}</h1>
      <p className="muted">
        {isRegister
          ? 'Crea una cuenta con email/password o continua con Google.'
          : 'Accede con Google o con email/password. Si falta profile, iremos a onboarding.'}
      </p>

      <button className="oauth-action" onClick={handleGoogleAuth} disabled={status === 'loading'}>
        Continue with Google
      </button>

      <div className="auth-divider">
        <span>o</span>
      </div>

      <div className="segmented">
        <button className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>
          Entrar
        </button>
        <button className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>
          Registrarse
        </button>
      </div>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(sanitizeText(event.target.value, 254))}
          placeholder="tu@email.com"
        />
      </label>

      <label className="field">
        <span>Contrasena</span>
        <input
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimo 8 caracteres"
        />
      </label>

      {message && <p className={status === 'error' ? 'auth-message error' : 'auth-message'}>{message}</p>}

      <button
        className="primary-action"
        onClick={() => finishEmailAuth(isRegister ? signUpWithEmail : signInWithEmail)}
        disabled={status === 'loading'}
      >
        {isRegister ? 'Crear cuenta' : 'Entrar'}
      </button>
    </section>
  )
}

// Pagina /login. Es una pantalla real, no un modal, para soportar redirecciones OAuth y mobile futuro.
export default function Login() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const initialMode = params.get('mode') === 'register' ? 'register' : 'login'
  const missingConfig = location.state?.reason === 'missing-config'

  return (
    <main className="auth-screen">
      {missingConfig && (
        <section className="auth-panel auth-warning">
          <p className="eyebrow">Configuracion</p>
          <p className="muted">Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.</p>
        </section>
      )}
      <LoginPanel key={initialMode} titleId="login-title" initialMode={initialMode} />
    </main>
  )
}
