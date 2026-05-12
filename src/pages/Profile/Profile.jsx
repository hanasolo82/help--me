import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { getUserById } from '../../services/usersApi'

// Perfil de usuario actual. De momento usa el seed user-mario; luego vendra de auth.uid().
export default function Profile() {
  const navigate = useNavigate()
  // Cambia este id si quieres probar otro usuario mock del usersApi.
  const user = getUserById('user-mario')

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>Mario</h1>
        </div>
      </header>

      <section className="profile-card">
        <div className="profile-avatar">M</div>
        <h2>{user.name}</h2>
        <p>{user.rating} estrellas · {user.ratingCount} valoraciones · usuario verificado</p>
      </section>

      <section className="stats-grid">
        <article>
          <strong>{user.completedTasks}</strong>
          <span>Ayudas dadas</span>
        </article>
        <article>
          <strong>6</strong>
          <span>Ayudas recibidas</span>
        </article>
        <article>
          <strong>Alto</strong>
          <span>Confianza</span>
        </article>
      </section>

      <BottomNav active="profile" requester />
    </main>
  )
}
