import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'

// Opciones del formulario. Si cambias categorias, sincronizalas con tasksService y Supabase SQL.
const categories = ['Perro', 'Recados', 'Compras', 'Ayuda tecnica']
// Precios sugeridos para reducir friccion al publicar.
const prices = [3, 5, 10]
// Urgencias permitidas en el MVP.
const urgencies = ['Ahora', 'Hoy', 'Flexible']

// Pantalla de publicacion de tareas. Todavia usa estado local; createTask() conectara con Supabase.
export default function CreateTask() {
  // Estados de chips seleccionables.
  const [price, setPrice] = useState(5)
  const [urgency, setUrgency] = useState('Ahora')
  const [category, setCategory] = useState('Perro')
  const navigate = useNavigate()

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home')} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">Nueva tarea</p>
          <h1>Publicar ayuda</h1>
        </div>
      </header>

      <section className="form-stack">
        <label className="field">
          <span>Titulo</span>
          <input defaultValue="Sacar al perro 30 min" />
        </label>

        <label className="field">
          <span>Descripcion</span>
          <textarea defaultValue="Necesito que alguien saque al perro durante media hora por Delicias." />
        </label>

        <label className="field">
          <span>Ubicacion</span>
          <input defaultValue="Zaragoza · Delicias" />
        </label>

        <div className="choice-group">
          <span>Categoria</span>
          <div className="chips">
            {categories.map((item) => (
              <button key={item} className={category === item ? 'chip selected' : 'chip'} onClick={() => setCategory(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="choice-group">
          <span>Precio sugerido</span>
          <div className="chips">
            {prices.map((item) => (
              <button key={item} className={price === item ? 'chip selected' : 'chip'} onClick={() => setPrice(item)}>
                {item} EUR
              </button>
            ))}
          </div>
        </div>

        <div className="choice-group">
          <span>Urgencia</span>
          <div className="chips">
            {urgencies.map((item) => (
              <button key={item} className={urgency === item ? 'chip selected' : 'chip'} onClick={() => setUrgency(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <button className="success-action" onClick={() => navigate('/home')}>
          Publicar tarea
        </button>
      </section>

      <BottomNav active="create" requester />
    </main>
  )
}
