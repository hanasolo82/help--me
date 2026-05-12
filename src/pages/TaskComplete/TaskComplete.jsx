import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

// Pantalla de cierre: confirma tarea y captura valoracion para actualizar ratings.
export default function TaskComplete() {
  // rating es el valor que luego se enviara a addUserRating/Supabase.
  const [rating, setRating] = useState(5)
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <main className="app-screen center-screen">
      <section className="completion-panel">
        <p className="eyebrow">Tarea #{id}</p>
        <h1>Se ha completado la tarea?</h1>
        <p className="muted">Confirma el resultado y deja una valoracion rapida.</p>

        <div className="two-actions">
          <button className="secondary-action">No</button>
          <button className="success-action">Si</button>
        </div>

        <label className="field">
          <span>Valoracion</span>
          <input type="range" min="1" max="5" value={rating} onChange={(event) => setRating(event.target.value)} />
        </label>
        <p className="rating-value">{rating} / 5</p>

        <button className="primary-action" onClick={() => navigate('/home')}>
          Cerrar tarea
        </button>
      </section>
    </main>
  )
}
