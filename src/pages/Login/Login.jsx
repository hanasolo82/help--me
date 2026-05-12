import { useState } from 'react'
import { sendEmailMagicLink, sendPhoneOtp, signInWithGoogle } from '../../services/authService'
import { sanitizeText } from '../../lib/security'

export function LoginPanel({ titleId, mode = 'login' }) {
  const [method, setMethod] = useState('phone')
  const [identifier, setIdentifier] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const isRegister = mode === 'register'

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

  async function handleOtpAuth() {
    setStatus('loading')
    setMessage('')

    try {
      if (method === 'phone') {
        await sendPhoneOtp(identifier)
        setMessage('Codigo enviado. Revisa tu telefono para continuar.')
      } else {
        await sendEmailMagicLink(identifier)
        setMessage('Magic link enviado. Revisa tu correo para continuar.')
      }

      setStatus('sent')
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  return (
    <section className="auth-panel">
      <p className="eyebrow">helpMe</p>
      <h1 id={titleId}>{isRegister ? 'Crea tu cuenta local' : 'Entra a tu red local'}</h1>
      <p className="muted">
        {isRegister
          ? 'Registrate con Google, telefono o correo para empezar a pedir y dar ayuda.'
          : 'Sin contrasena tradicional. Elige Google, telefono o magic link por correo.'}
      </p>

      <button className="oauth-action" onClick={handleGoogleAuth} disabled={status === 'loading'}>
        Continuar con Google
      </button>

      <div className="auth-divider">
        <span>o</span>
      </div>

      <div className="segmented">
        <button className={method === 'phone' ? 'selected' : ''} onClick={() => setMethod('phone')}>
          Telefono
        </button>
        <button className={method === 'email' ? 'selected' : ''} onClick={() => setMethod('email')}>
          Correo
        </button>
      </div>

      <label className="field">
        <span>{method === 'phone' ? 'Telefono' : 'Correo electronico'}</span>
        <input
          value={identifier}
          onChange={(event) => setIdentifier(sanitizeText(event.target.value, 254))}
          placeholder={method === 'phone' ? '+34 600 000 000' : 'tu@email.com'}
        />
      </label>

      {message && <p className={status === 'error' ? 'auth-message error' : 'auth-message'}>{message}</p>}

      <button className="primary-action" onClick={handleOtpAuth} disabled={status === 'loading'}>
        {isRegister
          ? method === 'phone' ? 'Crear cuenta con codigo' : 'Crear cuenta con correo'
          : method === 'phone' ? 'Enviar codigo' : 'Enviar magic link'}
      </button>
    </section>
  )
}

export default function Login() {
  return (
    <main className="auth-screen">
      <LoginPanel />
    </main>
  )
}
