import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { useAuth } from '../../contexts/useAuth'
import { getMyTasks } from '../../services/tasksService'
import { signOut } from '../../services/authService'

// Perfil del usuario autenticado. Lee profile real de Supabase y cuenta tareas como requester/helper.
export default function Profile() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const [helperCount, setHelperCount] = useState(0)
  const [requesterCount, setRequesterCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    Promise.all([
      getMyTasks({ role: 'helper' }),
      getMyTasks({ role: 'requester' }),
    ])
      .then(([helperTasks, requesterTasks]) => {
        if (cancelled) return
        setHelperCount(helperTasks.filter((task) => task.status === 'completed').length)
        setRequesterCount(requesterTasks.filter((task) => task.status === 'completed').length)
      })
      .catch(() => {
        if (cancelled) return
        setHelperCount(0)
        setRequesterCount(0)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function handleLogout() {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  if (!profile) {
    return (
      <main className="app-screen with-nav">
        <p className="muted">Cargando perfil...</p>
      </main>
    )
  }

  const initial = (profile.full_name || profile.username || '?').charAt(0).toUpperCase()
  const confianza = profile.rating >= 4.5 ? 'Alto' : profile.rating >= 3.5 ? 'Medio' : 'En construccion'

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>{profile.full_name}</h1>
        </div>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name} />
            : initial}
        </div>
        <h2>@{profile.username}</h2>
        <p>
          {profile.rating ?? 0} estrellas · {profile.completed_tasks ?? 0} tareas completadas
          {profile.verified ? ' · verificado' : ''}
        </p>
        <p className="muted">{profile.neighborhood}</p>
      </section>

      <section className="stats-grid">
        <article>
          <strong>{helperCount}</strong>
          <span>Ayudas dadas</span>
        </article>
        <article>
          <strong>{requesterCount}</strong>
          <span>Ayudas recibidas</span>
        </article>
        <article>
          <strong>{confianza}</strong>
          <span>Confianza</span>
        </article>
      </section>

      <button className="secondary-action" onClick={handleLogout}>
        Cerrar sesion
      </button>

      <BottomNav active="profile" />
    </main>
  )
}
