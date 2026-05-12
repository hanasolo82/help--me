import { useParams } from "react-router-dom"
import { useNavigate } from "react-router-dom"

// Detalle de tarea. Ahora usa contenido de maqueta; despues leeremos la tarea real por id desde Supabase.
export default function TaskDetail() {
  // id viene de la ruta /task/:id y sirve para abrir chat o cargar datos reales.
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <main className="app-screen">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Detalle de tarea</p>
          <h1>Sacar al perro 30 min</h1>
        </div>
      </header>

      <section className="detail-panel">
        <div className="detail-row">
          <span>Ubicacion</span>
          <strong>Zaragoza · Delicias</strong>
        </div>
        <div className="detail-row">
          <span>Precio</span>
          <strong>5 EUR</strong>
        </div>
        <div className="detail-row">
          <span>Urgencia</span>
          <strong>Ahora</strong>
        </div>
      </section>

      <section className="detail-panel">
        <h2>Descripcion</h2>
        <p>Necesito que alguien saque al perro durante 30 minutos. Es tranquilo, lleva arnes y la ruta es por el barrio.</p>
      </section>

      <section className="user-strip">
        <div className="avatar-small">L</div>
        <div>
          <strong>Laura</strong>
          <p>4.8 estrellas · 12 tareas publicadas · verificada</p>
        </div>
      </section>

      <button className="primary-action sticky-action" onClick={() => navigate(`/chat/${id}`)}>
        Aceptar tarea
      </button>
    </main>
  )
}
