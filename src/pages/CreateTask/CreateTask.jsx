import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../shared/components/BottomNav/BottomNav'
import { allowedCategories, allowedUrgencies, createTask } from '../../services/tasksService'
import { uploadTaskImage, validateImageFile } from '../../services/storageService'
import { resolveUserLocation } from '../../services/locationService'

// Sugerencias de precio (en EUR). Se convierten a centimos al guardar para evitar floats.
const priceSuggestions = [3, 5, 10]

// Publicacion de tarea conectada a Supabase: valida, sube imagen opcional y crea fila en tasks.
export default function CreateTask() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(allowedCategories[0])
  const [urgency, setUrgency] = useState(allowedUrgencies[0])
  const [priceEuros, setPriceEuros] = useState(5)
  const [location, setLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  // Pide ubicacion al entrar para que el usuario no tenga que tocar nada extra.
  useEffect(() => {
    let cancelled = false
    setLocationStatus('loading')

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
  }, [])

  // Libera el objectURL de la preview cuando cambia o se desmonta.
  useEffect(() => {
    if (!imagePreview) return
    return () => URL.revokeObjectURL(imagePreview)
  }, [imagePreview])

  function handleImageChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImagePreview('')
      return
    }

    try {
      validateImageFile(file)
    } catch (err) {
      setError(err.message)
      event.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    setImagePreview('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!location) {
      setError('Necesitamos tu ubicacion para publicar la tarea.')
      return
    }

    setStatus('loading')

    try {
      let imageUrl = null

      if (imageFile) {
        const uploaded = await uploadTaskImage(imageFile)
        imageUrl = uploaded.publicUrl
      }

      const created = await createTask({
        title,
        description,
        category,
        urgency,
        priceCents: Math.round(Number(priceEuros) * 100),
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl,
      })

      navigate(`/task/${created.id}`, { replace: true })
    } catch (err) {
      setStatus('error')
      setError(err.message || 'No se pudo publicar la tarea.')
    }
  }

  const isSubmitting = status === 'loading'

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

        <div className="field">
          <span>Imagen (opcional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Vista previa" />
              <button type="button" className="secondary-action" onClick={clearImage}>
                Quitar imagen
              </button>
            </div>
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

        <div className="choice-group">
          <span>Urgencia</span>
          <div className="chips">
            {allowedUrgencies.map((item) => (
              <button
                type="button"
                key={item}
                className={urgency === item ? 'chip selected' : 'chip'}
                onClick={() => setUrgency(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="auth-message error">{error}</p>}

        <button className="success-action" type="submit" disabled={isSubmitting || locationStatus !== 'ready'}>
          {isSubmitting ? 'Publicando...' : 'Publicar tarea'}
        </button>
      </form>

      <BottomNav active="create" requester />
    </main>
  )
}
