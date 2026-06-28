import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { allowedCategories, createTask, publishTask, updateTask } from '../../../../services/tasksService'
import { useAuth } from '../../../../contexts/useAuth'
import TaskAvailabilityFields from '../../../tasks/availability/TaskAvailabilityFields'
import GlitchSoftButton from '../../../../shared/ui/GlitchSoftButton'
import TaskLocationSearch from './TaskLocationSearch'
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
  const [price, setPrice] = useState(String(task?.price ?? ''))
  const [availability, setAvailability] = useState({
    requestedDate: task?.requested_date || '',
    requestedTimeSlot: task?.requested_time_slot || 'flexible',
    requestedTimeNote: task?.requested_time_note || '',
  })
  const [error, setError] = useState('')

  const resolvedLocation = useMemo(() => getTaskLocation(location, profile, task), [location, profile, task])
  const [taskLocation, setTaskLocation] = useState(() => resolvedLocation)
  const [locationEdited, setLocationEdited] = useState(false)

  useEffect(() => {
    if (locationEdited || taskLocation || !resolvedLocation) return

    let cancelled = false

    queueMicrotask(() => {
      if (cancelled) return
      setTaskLocation(resolvedLocation)
    })

    return () => {
      cancelled = true
    }
  }, [locationEdited, resolvedLocation, taskLocation])

  function handleTaskLocationChange(nextLocation) {
    setLocationEdited(true)
    setTaskLocation(nextLocation)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!taskLocation) {
      setError('Selecciona el lugar de la tarea para situarla en el mapa.')
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
        lat: taskLocation.lat,
        lng: taskLocation.lng,
        location_label: taskLocation.label || null,
        requested_date: availability.requestedDate || null,
        requested_time_slot: availability.requestedTimeSlot || null,
        requested_time_note: availability.requestedTimeNote || null,
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
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar solicitud">
            ×
          </button>
        </div>

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
              rows={3}
              required
            />
          </label>

          <TaskLocationSearch value={taskLocation} onChange={handleTaskLocationChange} />

          <TaskAvailabilityFields
            requestedDate={availability.requestedDate}
            requestedTimeSlot={availability.requestedTimeSlot}
            requestedTimeNote={availability.requestedTimeNote}
            onChange={setAvailability}
          />

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
              <span>Precio</span>
              <input type="number" min={0} max={500} value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" />
            </label>
          </div>

          {error ? <p className="auth-message error">{error}</p> : null}

          {!taskLocation && locationStatus !== 'loading' ? (
            <section className={styles.locationHint}>
              <strong>Selecciona dónde se realizará la tarea.</strong>
              <p className="muted">Puedes buscar una zona arriba o usar tu ubicación como punto inicial.</p>
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
            <GlitchSoftButton type="submit" variant="primary">
              {isEditing ? 'Guardar cambios' : 'Publicar solicitud'}
            </GlitchSoftButton>
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
    props.task?.location_label || '',
    props.task?.requested_date || '',
    props.task?.requested_time_slot || '',
    props.task?.requested_time_note || '',
    props.location?.label || '',
    props.locationStatus || '',
    props.open ? 'open' : 'closed',
  ].join('|')

  return <RequestTaskModalInner key={resetKey} {...props} />
}
