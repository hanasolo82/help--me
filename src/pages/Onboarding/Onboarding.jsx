import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { sanitizeText } from '../../lib/security'
import { createProfile } from '../../services/profilesService'

// Onboarding obligatorio: crea el profile separado de auth.users.
export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    fullName: user?.user_metadata?.full_name || '',
    neighborhood: '',
    avatarUrl: user?.user_metadata?.avatar_url || '',
  })
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  if (profile) {
    return <Navigate to="/home" replace />
  }

  function updateField(field, value, maxLength = 120) {
    setForm((current) => ({
      ...current,
      [field]: sanitizeText(value, maxLength),
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      await createProfile(user.id, form)
      await refreshProfile()
      navigate('/home', { replace: true })
    } catch (error) {
      setStatus('error')
      setMessage(error.message)
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-panel onboarding-panel" onSubmit={handleSubmit}>
        <p className="eyebrow">Onboarding</p>
        <h1>Completa tu perfil</h1>
        <p className="muted">Necesitamos estos datos para separar identidad de login y confianza dentro de helpMe.</p>

        <label className="field">
          <span>Username unico</span>
          <input
            autoComplete="username"
            value={form.username}
            onChange={(event) => updateField('username', event.target.value, 30)}
            placeholder="mario_delicias"
          />
        </label>

        <label className="field">
          <span>Nombre completo</span>
          <input
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => updateField('fullName', event.target.value, 80)}
            placeholder="Mario Garcia"
          />
        </label>

        <label className="field">
          <span>Barrio o zona</span>
          <input
            value={form.neighborhood}
            onChange={(event) => updateField('neighborhood', event.target.value, 80)}
            placeholder="Zaragoza · Delicias"
          />
        </label>

        <label className="field">
          <span>Avatar URL opcional</span>
          <input
            value={form.avatarUrl}
            onChange={(event) => updateField('avatarUrl', event.target.value, 500)}
            placeholder="https://..."
          />
        </label>

        {message && <p className={status === 'error' ? 'auth-message error' : 'auth-message'}>{message}</p>}

        <button className="primary-action" disabled={status === 'loading'}>
          Crear profile
        </button>
      </form>
    </main>
  )
}
