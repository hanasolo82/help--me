import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../../services/authService'
import Turnstile from '../../shared/components/Turnstile'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

// Solicita un email de reset. Respuesta generica para evitar enumeration de cuentas.
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaKey, setCaptchaKey] = useState(0)
  const captchaRequired = Boolean(TURNSTILE_SITE_KEY)
  const handleCaptcha = useCallback((token) => setCaptchaToken(token), [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'loading') return
    if (captchaRequired && !captchaToken) return

    setStatus('loading')
    await requestPasswordReset(email, { captchaToken })
    setCaptchaToken('')
    setCaptchaKey((k) => k + 1)
    setStatus('sent')
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">helpMe Auth</p>
        <h1>Recupera tu contrasena</h1>
        <p className="muted">
          Te enviaremos un enlace para crear una contrasena nueva si el correo esta registrado.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@email.com"
              disabled={status === 'sent'}
            />
          </label>

          {captchaRequired && status !== 'sent' && (
            <Turnstile
              key={captchaKey}
              siteKey={TURNSTILE_SITE_KEY}
              action="password_reset"
              onVerify={handleCaptcha}
            />
          )}

          {status === 'sent' && (
            <p className="auth-message" role="status">
              Si el correo es valido recibiras instrucciones en breve. Revisa tambien la carpeta de spam.
            </p>
          )}

          <button
            type="submit"
            className="primary-action"
            disabled={status === 'loading' || status === 'sent' || (captchaRequired && !captchaToken)}
          >
            {status === 'loading' ? 'Enviando...' : 'Enviar enlace'}
          </button>

          <p className="auth-aux">
            <Link to="/login">Volver a entrar</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
