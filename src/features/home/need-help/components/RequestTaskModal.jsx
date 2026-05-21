import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { allowedCategories, createTask, publishTask } from '../../../../services/tasksService'
import { useAuth } from '../../../../contexts/useAuth'
import styles from './RequestTaskModal.module.css'

const defaultCategories = allowedCategories

function getTaskLocation(location, profile) {
  const lat = Number(location?.lat ?? profile?.lat)
  const lng = Number(location?.lng ?? profile?.lng)
  const label = location?.label || profile?.displayLocation || profile?.neighborhood || profile?.city || ''

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, label }
  }

  return null
}

export default function RequestTaskModal({
  open,
  onClose,
  selectedHelper,
  location,
  locationStatus,
  onRequestLocation,
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(defaultCategories[0])
  const [zone, setZone] = useState('')
  const [price, setPrice] = useState('')
  const [visibility, setVisibility] = useState(selectedHelper ? 'private' : 'public')
  const [error, setError] = useState('')

  const resolvedLocation = useMemo(() => getTaskLocation(location, profile), [location, profile])

  useEffect(() => {
    if (open) {
      setVisibility(selectedHelper ? 'private' : 'public')
      setZone(location?.label || profile?.displayLocation || profile?.neighborhood || profile?.city || '')
    }
  }, [location?.label, open, profile?.city, profile?.displayLocation, profile?.neighborhood, selectedHelper])

  useEffect(() => {
    if (!open) {
      setError('')
    }
  }, [open])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!resolvedLocation) {
      setError('Necesitamos tu ubicación para publicar la solicitud.')
      return
    }

    if (!title.trim() || !description.trim()) {
      setError('Añade un título y una breve descripción.')
      return
    }

    try {
      const task = await createTask({
        title,
        description,
        category,
        price: Number(price || 0),
        lat: resolvedLocation.lat,
        lng: resolvedLocation.lng,
      })

      await publishTask(task.id)
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })

      onClose?.()
      navigate('/home', { replace: true, state: { mode: 'need' } })
    } catch (err) {
      setError(err?.message || 'No se pudo publicar la solicitud.')
    }
  }

  if (!open) return null

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Publicar solicitud"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <p className="eyebrow">Publicar solicitud</p>
            <h2>Cuéntanos qué necesitas</h2>
            <p className="muted">
              Publica una petición clara para que las personas disponibles cerca de ti puedan responder.
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar solicitud">
            ×
          </button>
        </div>

        {selectedHelper ? (
          <div className={styles.helperHint}>
            <strong>Propuesta privada para {selectedHelper.display_name || selectedHelper.full_name || selectedHelper.username || 'esta persona'}</strong>
            <p className="muted">
              Este modo queda preparado para una propuesta directa. La lógica fina de asignación se activará más adelante.
            </p>
          </div>
        ) : null}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className="field">
            <span>Título</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Sacar al perro 30 min" maxLength={90} required />
          </label>

          <label className="field">
            <span>Descripción</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Cuenta brevemente qué necesitas y en qué zona."
              maxLength={600}
              rows={4}
              required
            />
          </label>

          <div className={styles.inlineRow}>
            <label className="field">
              <span>Categoría</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {defaultCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Precio opcional</span>
              <input type="number" min={0} max={500} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" />
            </label>
          </div>

          <label className="field">
            <span>Zona</span>
            <input value={zone} onChange={(event) => setZone(event.target.value)} placeholder="Tu barrio, ciudad o zona" />
          </label>

          <div className={styles.visibility}>
            <button
              type="button"
              className={visibility === 'public' ? 'chip selected' : 'chip'}
              onClick={() => setVisibility('public')}
            >
              Pública
            </button>
            <button
              type="button"
              className={visibility === 'private' ? 'chip selected' : 'chip'}
              onClick={() => setVisibility('private')}
              disabled={!selectedHelper}
              title={!selectedHelper ? 'Selecciona una persona primero para usar esta opción' : ''}
            >
              Propuesta privada
            </button>
          </div>

          {error ? <p className="auth-message error">{error}</p> : null}

          {!resolvedLocation && locationStatus !== 'loading' ? (
            <section className={styles.locationHint}>
              <strong>Activa tu ubicación para publicar.</strong>
              <p className="muted">Usamos tu posición para situar la solicitud y que los ayudantes la vean cerca de ti.</p>
              {onRequestLocation ? (
                <button type="button" className="secondary-action" onClick={onRequestLocation}>
                  Usar mi ubicación
                </button>
              ) : null}
            </section>
          ) : null}

          <div className={styles.actions}>
            <button type="button" className="secondary-action" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-action">
              Publicar solicitud
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
