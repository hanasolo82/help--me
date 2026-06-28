import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { allowedCategories, canEditTask, createTask, updateTask } from '../../services/tasksService'
import { useTaskById } from '../../hooks/useTaskById'
import { useUserLocation } from '../../hooks/useUserLocation'
import TaskAvailabilityFields from '../../features/tasks/availability/TaskAvailabilityFields'
import TaskLocationPicker from '../../features/tasks/components/TaskLocationPicker'

const priceSuggestions = [3, 5, 10]

function getLocationPayload(location) {
  if (!location) return null

  return {
    latitude: location.lat,
    longitude: location.lng,
    label: location.label,
  }
}

function CreateTaskForm({
  taskId,
  isEditing,
  initialValues,
  task,
  location,
  requestLocation,
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(() => initialValues.title)
  const [description, setDescription] = useState(() => initialValues.description)
  const [category, setCategory] = useState(() => initialValues.category)
  const [priceEuros, setPriceEuros] = useState(() => initialValues.priceEuros)
  const [availability, setAvailability] = useState(() => initialValues.availability)
  const [selectedLocation, setSelectedLocation] = useState(() => initialValues.location)
  const [submitError, setSubmitError] = useState('')

  const formLocation = selectedLocation
  const locationReady = Boolean(formLocation)
  const canSubmitEdit = !isEditing || canEditTask(task)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formLocation) {
        throw new Error('Necesitamos que elijas un punto en el mapa para publicar la tarea.')
      }

      const payload = {
        title,
        description,
        category,
        price: Number(priceEuros),
        lat: formLocation.latitude,
        lng: formLocation.longitude,
        location_label: formLocation.label || null,
        requested_date: availability.requestedDate || null,
        requested_time_slot: availability.requestedTimeSlot || null,
        requested_time_note: availability.requestedTimeNote || null,
      }

      return isEditing ? updateTask(taskId, payload) : createTask(payload)
    },
    onSuccess: async (savedTask) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['task', savedTask.id] }),
      ])

      navigate('/home', { replace: true, state: { mode: 'need', taskId: savedTask.id } })
    },
    onError: (err) => {
      setSubmitError(err?.message || 'No se pudo guardar la tarea.')
    },
  })

  const blockingError =
    (isEditing && task && !canEditTask(task) ? 'Esta tarea ya no se puede editar porque ya fue aceptada o esta en curso.' : '') ||
    submitError ||
    saveMutation.error?.message ||
    ''

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    if (!formLocation) {
      setSubmitError('Necesitamos que elijas un punto en el mapa para publicar la tarea.')
      return
    }

    if (isEditing && !canSubmitEdit) {
      setSubmitError('Esta tarea ya no se puede editar porque ya fue aceptada o esta en curso.')
      return
    }

    try {
      await saveMutation.mutateAsync()
    } catch {
      // El mensaje ya se muestra desde onError.
    }
  }

  return (
    <>
      <form className="create-task-form" onSubmit={handleSubmit}>
        <div className="create-task-main">
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

          <TaskAvailabilityFields
            requestedDate={availability.requestedDate}
            requestedTimeSlot={availability.requestedTimeSlot}
            requestedTimeNote={availability.requestedTimeNote}
            onChange={setAvailability}
          />

          <div className="choice-group">
            <span>Precio sugerido</span>
            <div className="chips">
              {priceSuggestions.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={Number(priceEuros) === item ? 'chip selected' : 'chip'}
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
        </div>

        <div className="create-task-side">
          <TaskLocationPicker
            value={selectedLocation}
            onChange={setSelectedLocation}
            center={location ? { latitude: location.lat, longitude: location.lng } : null}
            centerLabel={location?.label || 'Mapa centrado en tu zona aproximada'}
            onRequestCenter={requestLocation}
          />

          {blockingError && <p className="auth-message error">{blockingError}</p>}

          <button
            className="success-action"
            type="submit"
            disabled={saveMutation.isPending || !locationReady || !canSubmitEdit}
          >
            {saveMutation.isPending ? (isEditing ? 'Guardando cambios...' : 'Guardando...') : isEditing ? 'Guardar cambios' : 'Guardar'}
          </button>
        </div>
      </form>
    </>
  )
}

// Publicacion de tarea conectada a Supabase: valida y crea fila en tasks.
export default function CreateTask() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const taskId = new URLSearchParams(routeLocation.search).get('taskId')
  const isEditing = Boolean(taskId)
  const { task, loading: loadingTask, error: taskError } = useTaskById(taskId)
  const { location, requestLocation } = useUserLocation()
  const initialValues = useMemo(() => {
    if (isEditing && task) {
      return {
        title: task.title || '',
        description: task.description || '',
        category: task.category || allowedCategories[0],
        priceEuros: Number(task.price ?? 0),
        availability: {
          requestedDate: task.requested_date || '',
          requestedTimeSlot: task.requested_time_slot || 'flexible',
          requestedTimeNote: task.requested_time_note || '',
        },
        location: getLocationPayload({
          lat: Number(task.lat),
          lng: Number(task.lng),
          label: task.location_label || 'Ubicacion guardada',
        }),
      }
    }

    return {
      title: '',
      description: '',
      category: allowedCategories[0],
      priceEuros: 5,
      availability: {
        requestedDate: '',
        requestedTimeSlot: 'flexible',
        requestedTimeNote: '',
      },
      location: null,
    }
  }, [isEditing, task])

  const pageTitle = isEditing ? 'Editar tarea' : 'Nueva tarea'
  const pageHeading = isEditing ? 'Guardar cambios' : 'Guardar ayuda'

  if (loadingTask) {
    return (
      <main className="app-screen with-nav">
        <p className="muted">Cargando tarea...</p>
      </main>
    )
  }

  if (isEditing && taskError && !task) {
    return (
      <main className="app-screen with-nav">
        <header className="page-header">
          <button className="icon-button" onClick={() => navigate('/home', { state: { mode: 'need' } })} aria-label="Volver">
            ←
          </button>
          <div>
            <p className="eyebrow">{pageTitle}</p>
            <h1>{pageHeading}</h1>
          </div>
        </header>
        <p className="auth-message error">{taskError}</p>
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
          <p className="eyebrow">{pageTitle}</p>
          <h1>{pageHeading}</h1>
        </div>
      </header>

      <CreateTaskForm
        key={task?.id || taskId || 'new-task'}
        taskId={taskId}
        isEditing={isEditing}
        initialValues={initialValues}
        task={task}
        location={location}
        requestLocation={requestLocation}
      />
    </main>
  )
}
