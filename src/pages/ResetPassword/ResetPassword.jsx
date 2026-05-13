import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { estimatePasswordStrength } from '../../lib/security'
import { updatePassword } from '../../services/authService'

// Pagina destino del email de reset. Supabase deja una sesion temporal con evento
// PASSWORD_RECOVERY al llegar desde el link. Aqui dejamos al usuario fijar nueva password.
export default function ResetPassword() {
  // Si no hay supabase, no hay nada que validar: pantalla "ready" desde el inicio.
  const [ready, setReady] = useState(() => !supabase)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabase) return

    let active = true

    // Hidratamos sesion: si el usuario llega desde el email, Supabase ya inyecto el token.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setHasRecoverySession(Boolean(data.session))
      setReady(true)
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setHasRecoverySession(Boolean(session))
        setReady(true)
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    if (status === 'loading') return

    if (password !== confirm) {
      setStatus('error')
      setMessage('Las contrasenas no coinciden.')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      await updatePassword(password)
      setStatus('done')
      setMessage('Contrasena actualizada. Redirigiendo a tu cuenta...')
      setTimeout(() => navigate('/home', { replace: true }), 1500)
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  const strength = estimatePasswordStrength(password)

  if (!ready) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Seguridad</p>
          <h1>Validando enlace</h1>
        </section>
      </main>
    )
  }

  if (!hasRecoverySession) {
    return (
      <main className="auth-screen">
        <section className="auth-panel">
          <p className="eyebrow">Enlace expirado</p>
          <h1>Necesitas un enlace nuevo</h1>
          <p className="muted">
            El enlace de recuperacion ha caducado o ya fue usado. Solicitalo de nuevo.
          </p>
          <button
            type="button"
            className="primary-action"
            onClick={() => navigate('/forgot-password', { replace: true })}
          >
            Pedir enlace nuevo
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">helpMe Auth</p>
        <h1>Crea una contrasena nueva</h1>
        <p className="muted">Minimo 12 caracteres, con al menos 3 tipos: mayusculas, minusculas, numeros y simbolos.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Nueva contrasena</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimo 12 caracteres"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
              >
                {showPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            {password && (
              <div className="strength-meter" aria-live="polite">
                <div className={`strength-bar strength-${strength.score}`} />
                <span className="strength-label">{strength.label}</span>
              </div>
            )}
          </label>

          <label className="field">
            <span>Repite la contrasena</span>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={12}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repite la contrasena"
            />
          </label>

          {message && (
            <p
              className={status === 'error' ? 'auth-message error' : 'auth-message'}
              role={status === 'error' ? 'alert' : 'status'}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            className="primary-action"
            disabled={status === 'loading' || status === 'done'}
          >
            {status === 'loading' ? 'Actualizando...' : 'Actualizar contrasena'}
          </button>
        </form>
      </section>
    </main>
  )
}
