import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { estimatePasswordStrength, validateEmail } from '../../../lib/security'
import { clearRememberedEmail, readRememberedEmail } from '../../../lib/consent'
import Turnstile from '../Turnstile'
import googleIcon from '../../../assets/icons/goggle.svg'
import {
  resendSignupConfirmation,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../../../services/authService'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

const STATUS = Object.freeze({
  idle: 'idle',
  loading: 'loading',
  sent: 'sent',
  error: 'error',
})

const VIEW_COPY = Object.freeze({
  remembered: {
    title: 'Bienvenido de vuelta',
    submit: 'Entrar',
  },
  register: {
    title: 'Crea tu cuenta',
   
    submit: 'Crear cuenta',
  },
  login: {
    title: 'Entra en helpMe',
    submit: 'Entrar',
  },
})

// Panel de autenticacion reusable entre la pagina /login y el AuthModal de la landing.
// Si hay un email recordado en localStorage, el formulario se compacta a solo password.
export default function AuthPanel({ titleId, initialMode = 'login', onSuccess }) {
  const initialRemembered = readRememberedEmail()
  const [rememberedEmail, setRememberedEmail] = useState(initialRemembered)
  const [mode, setMode] = useState(initialRemembered ? 'login' : initialMode)
  const [email, setEmail] = useState(initialRemembered || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [status, setStatus] = useState(STATUS.idle)
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const emailInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const hasRemembered = Boolean(rememberedEmail)
  const isRegister = mode === 'register' && !hasRemembered
  const captchaRequired = Boolean(TURNSTILE_SITE_KEY)
  const view = hasRemembered ? 'remembered' : isRegister ? 'register' : 'login'
  const copy = VIEW_COPY[view]

  const handleCaptcha = useCallback((token) => setCaptchaToken(token), [])
  const resetCaptcha = useCallback(() => {
    setCaptchaToken('')
    setCaptchaKey((k) => k + 1)
  }, [])

  useEffect(() => {
    if (hasRemembered) {
      passwordInputRef.current?.focus()
    } else {
      emailInputRef.current?.focus()
    }
  }, [mode, hasRemembered])

  function useAnotherAccount() {
    clearRememberedEmail()
    setRememberedEmail('')
    setEmail('')
    setPassword('')
    setMode('login')
    setMessage('')
    setStatus(STATUS.idle)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === STATUS.loading) return

    const finalEmail = hasRemembered ? rememberedEmail : email
    const emailCheck = validateEmail(finalEmail)

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
      const result = await authAction({ email: finalEmail, password, captchaToken })

      if (!result.session) {
        setStatus(STATUS.sent)
        setMessage('Revisa tu correo para confirmar la cuenta antes de entrar.')
        resetCaptcha()
        return
      }

      const nextProfile = await refreshProfile()
      const destination = nextProfile ? '/home' : '/onboarding'

      if (onSuccess) {
        onSuccess({ destination, profile: nextProfile })
      } else {
        navigate(destination, { replace: true })
      }
    } catch (error) {
      setStatus(STATUS.error)
      setMessage(error.message)
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
    await resendSignupConfirmation(hasRemembered ? rememberedEmail : email)
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
      <h1 id={titleId}>{copy.title}</h1>

      {!hasRemembered && (
        <>
          <button
            type="button"
            className="oauth-action"
            onClick={handleGoogleAuth}
            disabled={status === STATUS.loading}
          >
            <img src={googleIcon} alt="" aria-hidden="true" />
            Continuar con Google
          </button>

          <div className="auth-divider">
            <span>o</span>
          </div>

          <div className="segmented" role="tablist" aria-label="Modo de autenticacion" data-mode={mode}>
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
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {hasRemembered ? (
          <div className="remembered-account" aria-live="polite">
            <div>
              <span className="eyebrow">Cuenta</span>
              <strong>{rememberedEmail}</strong>
            </div>
            <button type="button" className="link-button" onClick={useAnotherAccount}>
              Usar otra cuenta
            </button>
          </div>
        ) : (
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
        )}

        <label className="field">
          <span>Contraseña</span>
          <div className="password-field">
            <input
              ref={passwordInputRef}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              type={showPassword ? 'text' : 'password'}
              required
              minLength={isRegister ? 12 : 8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={isRegister ? 'Minimo 12 caracteres' : 'Tu contraseña'}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
          <div
            className={
              isRegister && strength && password
                ? 'strength-meter'
                : 'strength-meter strength-meter-placeholder'
            }
            aria-live={isRegister && strength && password ? 'polite' : undefined}
            aria-hidden={!(isRegister && strength && password)}
          >
            <div className={`strength-bar strength-${isRegister && strength ? strength.score : 0}`} />
            <span className="strength-label">{isRegister && strength && password ? strength.label : ' '}</span>
          </div>
        </label>

        <p className={isRegister ? 'auth-aux auth-aux-placeholder' : 'auth-aux'}>
          <Link to="/forgot-password" tabIndex={isRegister ? -1 : 0} aria-hidden={isRegister}>
            Olvide mi contrasena
          </Link>
        </p>

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
          className="primary-action auth-submit-action"
          disabled={status === STATUS.loading || (captchaRequired && !captchaToken)}
        >
          {copy.submit}
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

      {!hasRemembered && (
        <p className="auth-legal">
          Al continuar aceptas los{' '}
          <Link to="/legal/terms">Terminos</Link>
          {' '}y la{' '}
          <Link to="/legal/privacy">Politica de privacidad</Link>.
        </p>
      )}
    </section>
  )
}
