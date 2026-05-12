import { useParams, useNavigate } from "react-router-dom"

// Chat MVP: mensajes estaticos para validar flujo antes de conectar tabla messages.
export default function Chat() {
  // id identifica la tarea/chat actual y permite volver al detalle o completar.
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <main className="chat-screen">
      <header className="chat-header">
        <button className="icon-button" onClick={() => navigate(`/task/${id}`)} aria-label="Volver">
          ←
        </button>
        <div>
          <strong>Laura</strong>
          <p>Sacar al perro 30 min</p>
        </div>
      </header>

      <section className="messages">
        <p className="message incoming">Hola, gracias por aceptar. Te paso la correa en el portal.</p>
        <p className="message outgoing">Perfecto. Llego en unos 10 minutos.</p>
        <p className="message incoming">Genial, te espero.</p>
      </section>

      <footer className="chat-actions">
        <button className="secondary-action">Contactar</button>
        <button className="success-action" onClick={() => navigate(`/complete/${id}`)}>
          Marcar completada
        </button>
      </footer>
    </main>
  )
}
