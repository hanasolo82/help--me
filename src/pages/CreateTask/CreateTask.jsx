import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { allowedCategories, canEditTask, createTask, getTaskById, updateTask } from '../../services/tasksService'
import { resolveUserLocation } from '../../services/locationService'

const priceSuggestions = [3, 5, 10]

// Publicacion de tarea conectada a Supabase: valida y crea fila en tasks.
export default function CreateTask() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const taskId = new URLSearchParams(routeLocation.search).get('taskId')
  const isEditing = Boolean(taskId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(allowedCategories[0])
  const [priceEuros, setPriceEuros] = useState(5)
  const [location, setLocation] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [locationStatus, setLocationStatus] = useState('loading')
  const [loadingTask, setLoadingTask] = useState(Boolean(taskId))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    if (taskId) {
      getTaskById(taskId)
        .then((task) => {
          if (cancelled) return

          if (!task) {
            setError('No encontramos la tarea que quieres editar.')
            setLocationStatus('error')
            setLoadingTask(false)
            return
          }

          if (!canEditTask(task)) {
            setError('Esta tarea ya no se puede editar porque ya fue aceptada o esta en curso.')
            setLocationStatus('error')
            setLoadingTask(false)
            return
          }

          setTitle(task.title || '')
          setDescription(task.description || '')
          setCategory(task.category || allowedCategories[0])
          setPriceEuros(Number(task.price ?? 0))
          setEditingTask(task)
          setLocation({
            latitude: Number(task.lat),
            longitude: Number(task.lng),
            label: 'Ubicacion guardada',
          })
          setLocationStatus('ready')
          setLoadingTask(false)
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err.message || 'No se pudo cargar la tarea.')
            setLocationStatus('error')
            setLoadingTask(false)
          }
        })

      return () => {
        cancelled = true
      }
    }

    resolveUserLocation()
      .then((resolved) => {
        if (!cancelled) {
          setLocation(resolved)
          setLocationStatus('ready')
        }
      })
      .catch(() => {
        if (!cancelled) setLocationStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [taskId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!location) {
      setError('Necesitamos tu ubicacion para publicar la tarea.')
      return
    }

    setStatus('loading')

    try {
      const payload = {
        title,
        description,
        category,
        price: Number(priceEuros),
        lat: location.latitude,
        lng: location.longitude,
      }

      const saved = isEditing ? await updateTask(taskId, payload) : await createTask(payload)

      navigate('/home', { replace: true, state: { mode: 'need', taskId: saved.id } })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo guardar la tarea.')
    }
  }

  const isSubmitting = status === 'loading'
  const canSubmitEdit = !isEditing || canEditTask(editingTask)
  const submitLabel = isEditing ? 'Guardar cambios' : 'Guardar'
  const titleLabel = isEditing ? 'Editar tarea' : 'Nueva tarea'
  const headingLabel = isEditing ? 'Guardar cambios' : 'Guardar ayuda'

  if (loadingTask) {
    return (
      <main className="app-screen with-nav">
        <p className="muted">Cargando tarea...</p>
      </main>
    )
  }

  return (
    <main className="app-screen with-nav">
      <header className="page-header">
        <button className="icon-button" onClick={() => navigate('/home', { state: { mode: 'need' } })} aria-label="Volver">
          ←
        </button>
        <div>
          <p className="eyebrow">{titleLabel}</p>
          <h1>{headingLabel}</h1>
        </div>
      </header>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Titulo</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Sacar al perro 30 min"
            maxLength={90}
            required
          />
        </label>

        <label className="field">
          <span>Descripcion</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Cuenta brevemente lo que necesitas."
            maxLength={600}
            rows={4}
            required
          />
        </label>

        <div className="field">
          <span>Ubicacion</span>
          <p className="muted">
            {locationStatus === 'loading' && 'Resolviendo ubicacion...'}
            {locationStatus === 'ready' && (location?.label || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)}
            {locationStatus === 'error' && 'No pudimos obtener tu ubicacion. Reintenta.'}
          </p>
          {locationStatus === 'error' && (
            <button
              type="button"
              className="secondary-action"
              onClick={() => {
                setLocationStatus('loading')
                resolveUserLocation()
                  .then((resolved) => {
                    setLocation(resolved)
                    setLocationStatus('ready')
                  })
                  .catch(() => setLocationStatus('error'))
              }}
            >
              Reintentar ubicacion
            </button>
          )}
        </div>

        <div className="choice-group">
          <span>Categoria</span>
          <div className="chips">
            {allowedCategories.map((item) => (
              <button
                type="button"
                key={item}
                className={category === item ? 'chip selected' : 'chip'}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="choice-group">
          <span>Precio sugerido</span>
          <div className="chips">
            {priceSuggestions.map((item) => (
              <button
                type="button"
                key={item}
                className={priceEuros === item ? 'chip selected' : 'chip'}
                onClick={() => setPriceEuros(item)}
              >
                {item} EUR
              </button>
            ))}
          </div>
          <input
            className="field"
            type="number"
            min={0}
            max={500}
            step={1}
            value={priceEuros}
            onChange={(event) => setPriceEuros(event.target.value)}
            aria-label="Precio personalizado"
          />
        </div>

        {error && <p className="auth-message error">{error}</p>}

        <button className="success-action" type="submit" disabled={isSubmitting || locationStatus !== 'ready' || !canSubmitEdit}>
          {isSubmitting ? (isEditing ? 'Guardando cambios...' : 'Guardando...') : submitLabel}
        </button>
      </form>

      <BottomNav active="create" requester />
    </main>
  )
}
