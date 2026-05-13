import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { estimatePasswordStrength, validateEmail } from '../../lib/security'
import Turnstile from '../../shared/components/Turnstile'
import {
  resendSignupConfirmation,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../../services/authService'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

// Estados posibles del formulario. Usamos const para evitar typos en string magico.
const STATUS = Object.freeze({
  idle: 'idle',
  loading: 'loading',
  sent: 'sent',
  error: 'error',
})

// Panel reutilizable para la pagina /login. Mantiene la logica en servicios, no en Supabase directo.
export function LoginPanel({ titleId, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [status, setStatus] = useState(STATUS.idle)
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const emailInputRef = useRef(null)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const isRegister = mode === 'register'
  const captchaRequired = Boolean(TURNSTILE_SITE_KEY)
  const handleCaptcha = useCallback((token) => setCaptchaToken(token), [])
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('')
    setCaptchaKey((k) => k + 1)
  }, [])

  // Al cambiar de tab, mover focus al primer input para mejor UX y accesibilidad.
  useEffect(() => {
    emailInputRef.current?.focus()
  }, [mode])

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === STATUS.loading) return

    const emailCheck = validateEmail(email)
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.error)
      return
    }
    setEmailError('')

    if (captchaRequired && !captchaToken) {
      setStatus(STATUS.error)
      setMessage('Completa el reto de seguridad antes de continuar.')
      return
    }

    setStatus(STATUS.loading)
    setMessage('')

    try {
      const authAction = isRegister ? signUpWithEmail : signInWithEmail
      const result = await authAction({ email, password, captchaToken })

      if (!result.session) {
        setStatus(STATUS.sent)
        setMessage('Revisa tu correo para confirmar la cuenta antes de entrar.')
        resetCaptcha()
        return
      }

      const nextProfile = await refreshProfile()
      navigate(nextProfile ? '/home' : '/onboarding', { replace: true })
    } catch (error) {
      setStatus(STATUS.error)
      setMessage(error.message)
      // Cada token de Turnstile es de un solo uso; al fallar, pedimos uno nuevo.
      resetCaptcha()
    }
  }

  async function handleGoogleAuth() {
    setStatus(STATUS.loading)
    setMessage('')

    try {
      await signInWithGoogle()
    } catch (error) {
      setStatus(STATUS.error)
      setMessage(error.message)
    }
  }

  async function handleResend() {
    setMessage('Reenviando correo...')
    await resendSignupConfirmation(email)
    setMessage('Si el correo es valido recibiras un nuevo email de confirmacion.')
  }

  function handleEmailBlur() {
    if (!email) {
      setEmailError('')
      return
    }
    const check = validateEmail(email)
    setEmailError(check.isValid ? '' : check.error)
  }

  const strength = isRegister ? estimatePasswordStrength(password) : null

  return (
    <section className="auth-panel">
      <p className="eyebrow">helpMe Auth</p>
      <h1 id={titleId}>{isRegister ? 'Crea tu cuenta' : 'Entra en helpMe'}</h1>
      <p className="muted">
        {isRegister
          ? 'Crea una cuenta con email/password o continua con Google.'
          : 'Accede con Google o con email/password. Si falta profile, iremos a onboarding.'}
      </p>

      <button
        type="button"
        className="oauth-action"
        onClick={handleGoogleAuth}
        disabled={status === STATUS.loading}
      >
        Continuar con Google
      </button>

      <div className="auth-divider">
        <span>o</span>
      </div>

      <div className="segmented" role="tablist" aria-label="Modo de autenticacion">
        <button
          type="button"
          role="tab"
          aria-selected={!isRegister}
          className={mode === 'login' ? 'selected' : ''}
          onClick={() => setMode('login')}
        >
          Entrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isRegister}
          className={mode === 'register' ? 'selected' : ''}
          onClick={() => setMode('register')}
        >
          Registrarse
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>Email</span>
          <input
            ref={emailInputRef}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'email-error' : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={handleEmailBlur}
            placeholder="tu@email.com"
          />
          {emailError && (
            <span id="email-error" className="field-error" role="alert">
              {emailError}
            </span>
          )}
        </label>

        <label className="field">
          <span>Contrasena</span>
          <div className="password-field">
            <input
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={isRegister ? 12 : 8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? 'Minimo 12 caracteres' : 'Tu contrasena'}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          {strength && password && (
            <div className="strength-meter" aria-live="polite">
              <div className={`strength-bar strength-${strength.score}`} />
              <span className="strength-label">{strength.label}</span>
            </div>
          )}
        </label>

        {!isRegister && (
          <p className="auth-aux">
            <Link to="/forgot-password">Olvide mi contrasena</Link>
          </p>
        )}

        {captchaRequired && (
          <Turnstile
            key={captchaKey}
            siteKey={TURNSTILE_SITE_KEY}
            action={isRegister ? 'signup' : 'signin'}
            onVerify={handleCaptcha}
          />
        )}

        {message && (
          <p
            className={status === STATUS.error ? 'auth-message error' : 'auth-message'}
            role={status === STATUS.error ? 'alert' : 'status'}
          >
            {message}
          </p>
        )}

        <button
          type="submit"
          className="primary-action"
          disabled={status === STATUS.loading || (captchaRequired && !captchaToken)}
        >
          {isRegister ? 'Crear cuenta' : 'Entrar'}
        </button>

        {status === STATUS.sent && isRegister && (
          <button
            type="button"
            className="secondary-action"
            onClick={handleResend}
          >
            Reenviar email de confirmacion
          </button>
        )}
      </form>
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
