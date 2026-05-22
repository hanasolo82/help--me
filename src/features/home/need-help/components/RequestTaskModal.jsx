import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { allowedCategories, createTask, publishTask, updateTask } from '../../../../services/tasksService'
import { useAuth } from '../../../../contexts/useAuth'
import styles from './RequestTaskModal.module.css'

const defaultCategories = allowedCategories

function getTaskLocation(location, profile, task) {
  const taskLat = Number(task?.lat)
  const taskLng = Number(task?.lng)
  if (Number.isFinite(taskLat) && Number.isFinite(taskLng)) {
    return { lat: taskLat, lng: taskLng, label: task?.zone || task?.location_label || task?.location || '' }
  }

  const lat = Number(location?.lat ?? profile?.lat)
  const lng = Number(location?.lng ?? profile?.lng)
  const label = location?.label || profile?.displayLocation || profile?.neighborhood || profile?.city || ''

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng, label }
  }

  return null
}

function RequestTaskModalInner({
  onClose,
  task,
  initialTitle,
  selectedHelper,
  location,
  locationStatus,
  onRequestLocation,
  onSaved,
}) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const isEditing = Boolean(task?.id)
  const [title, setTitle] = useState(task?.title || initialTitle || '')
  const [description, setDescription] = useState(task?.description || '')
  const [category, setCategory] = useState(task?.category || defaultCategories[0])
  const [zone, setZone] = useState(task?.zone || location?.label || profile?.displayLocation || profile?.neighborhood || profile?.city || '')
  const [price, setPrice] = useState(String(task?.price ?? ''))
  const [visibility, setVisibility] = useState(isEditing ? 'public' : selectedHelper ? 'private' : 'public')
  const [error, setError] = useState('')

  const resolvedLocation = useMemo(() => getTaskLocation(location, profile, task), [location, profile, task])

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
      const payload = {
        title,
        description,
        category,
        price: Number(price || 0),
        lat: resolvedLocation.lat,
        lng: resolvedLocation.lng,
      }

      const savedTask = isEditing ? await updateTask(task.id, payload) : await createTask(payload).then((draftTask) => publishTask(draftTask.id))

      if (!isEditing) {
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      }

      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      if (profile?.id) {
        await queryClient.invalidateQueries({ queryKey: ['my-tasks', profile.id] })
      }

      onSaved?.(savedTask)
      onClose?.()
    } catch (err) {
      setError(err?.message || 'No se pudo publicar la solicitud.')
    }
  }

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
            <p className="eyebrow">{isEditing ? 'Editar solicitud' : 'Publicar solicitud'}</p>
            <h2>{isEditing ? 'Ajusta tu solicitud' : 'Cuéntanos qué necesitas'}</h2>
            <p className="muted">
              {isEditing
                ? 'Mantendremos la solicitud como visible si sigue abierta.'
                : 'Publica una petición clara para que las personas disponibles cerca de ti puedan responder.'}
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
              {isEditing ? 'Guardar cambios' : 'Publicar solicitud'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default function RequestTaskModal(props) {
  if (!props.open) return null

  const resetKey = [
    props.task?.id || 'new',
    props.initialTitle || '',
    props.selectedHelper?.id || 'public',
    props.location?.label || '',
    props.locationStatus || '',
    props.open ? 'open' : 'closed',
  ].join('|')

  return <RequestTaskModalInner key={resetKey} {...props} />
}
