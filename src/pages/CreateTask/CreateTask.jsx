import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../contexts/useAuth'
import { allowedCategories, canEditTask, createTask, updateTask } from '../../services/tasksService'
import { useTaskById } from '../../hooks/useTaskById'
import { useUserLocation } from '../../hooks/useUserLocation'
import TaskAvailabilityFields from '../../features/tasks/availability/TaskAvailabilityFields'
import TaskLocationPicker from '../../features/tasks/components/TaskLocationPicker'

const priceSuggestions = [3, 5, 10]

// Etiquetas visibles con tildes; el value guardado en DB no cambia.
const CATEGORY_LABELS = {
  'Mascotas': 'Mascotas',
  'Recados': 'Recados',
  'Compras': 'Compras',
  'Ayuda tecnica': 'Ayuda técnica',
}

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
  const [saved, setSaved] = useState(false)
  const redirectTimerRef = useRef(null)

  const formLocation = selectedLocation
  const locationReady = Boolean(formLocation)
  const canSubmitEdit = !isEditing || canEditTask(task)

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
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

      // Confirmación visible antes del redirect: sin esto el usuario no sabía
      // si su solicitud se había enviado (hallazgo de QA).
      setSaved(true)
      redirectTimerRef.current = window.setTimeout(() => {
        navigate('/home', { replace: true, state: { mode: 'need', taskId: savedTask.id } })
      }, 1300)
    },
    onError: (err) => {
      setSubmitError(err?.message || 'No se pudo guardar la tarea.')
    },
  })

  const blockingError =
    (isEditing && task && !canEditTask(task) ? 'Esta tarea ya no se puede editar porque ya fue aceptada o está en curso.' : '') ||
    submitError ||
    saveMutation.error?.message ||
    ''

  // Validación propia en español (noValidate): los mensajes nativos del
  // navegador salían en inglés, p. ej. en el campo de precio (QA).
  function validateForm() {
    if (!title.trim()) return 'Ponle un título a tu solicitud.'
    if (!description.trim()) return 'Cuéntanos brevemente qué necesitas.'

    const price = Number(priceEuros)
    if (!Number.isFinite(price) || price < 0) return 'El precio no puede ser negativo.'
    if (price > 500) return 'El precio máximo es 500 €.'

    if (!formLocation) return 'Selecciona un punto en el mapa para continuar.'

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitError('')

    const validationError = validateForm()
    if (validationError) {
      setSubmitError(validationError)
      return
    }

    if (isEditing && !canSubmitEdit) {
      setSubmitError('Esta tarea ya no se puede editar porque ya fue aceptada o está en curso.')
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
      <form className="create-task-form" onSubmit={handleSubmit} noValidate>
        <div className="create-task-main">
          <label className="field">
            <span>Título</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Sacar al perro 30 min"
              maxLength={90}
              required
            />
          </label>

          <label className="field">
            <span>Descripción</span>
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
            <span>Categoría</span>
            <div className="chips">
              {allowedCategories.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={category === item ? 'chip selected' : 'chip'}
                  onClick={() => setCategory(item)}
                >
                  {CATEGORY_LABELS[item] || item}
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
            missing={!locationReady}
            center={location ? { latitude: location.lat, longitude: location.lng } : null}
            centerLabel={location?.label || 'Mapa centrado en tu zona aproximada'}
            onRequestCenter={requestLocation}
          />

          {!locationReady && !blockingError ? (
            <p className="create-task-hint" role="status">
              📍 Selecciona un punto en el mapa para continuar.
            </p>
          ) : null}

          {blockingError && <p className="auth-message error">{blockingError}</p>}

          <button
            className="success-action"
            type="submit"
            disabled={saveMutation.isPending || saved || !locationReady || !canSubmitEdit}
          >
            {saveMutation.isPending
              ? (isEditing ? 'Guardando cambios...' : 'Publicando...')
              : isEditing
                ? 'Guardar cambios'
                : 'Publicar solicitud'}
          </button>
        </div>
      </form>

      {saved ? (
        <div className="create-task-toast" role="status" aria-live="polite">
          <span className="create-task-toast-check" aria-hidden="true">✓</span>
          <div>
            <strong>{isEditing ? 'Cambios guardados' : 'Solicitud publicada'}</strong>
            <p>{isEditing ? 'Te llevamos de vuelta al mapa.' : 'Los vecinos de tu zona ya pueden verla. Te llevamos al mapa.'}</p>
          </div>
        </div>
      ) : null}
    </>
  )
}

// Publicacion de tarea conectada a Supabase: valida y crea fila en tasks.
export default function CreateTask() {
  const navigate = useNavigate()
  const routeLocation = useLocation()
  const { profile } = useAuth()
  const taskId = new URLSearchParams(routeLocation.search).get('taskId')
  const isEditing = Boolean(taskId)
  const { task, loading: loadingTask, error: taskError } = useTaskById(taskId)
  const { location, status: locationStatus, requestLocation } = useUserLocation()

  // Igual que /home: pide la geolocalización al entrar para centrar el mapa.
  useEffect(() => {
    if (location || locationStatus !== 'idle') return
    requestLocation()
  }, [location, locationStatus, requestLocation])

  // Ubicación efectiva para centrar el mini-mapa: geolocalización si la hay,
  // y si no, la zona del perfil (antes caía al centro por defecto: Zaragoza).
  const effectiveLocation = useMemo(() => {
    if (location) return location

    const lat = Number(profile?.lat)
    const lng = Number(profile?.lng)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
        label: profile?.visible_zone_name || profile?.neighborhood || profile?.city || 'Tu zona',
      }
    }

    return null
  }, [location, profile?.city, profile?.lat, profile?.lng, profile?.neighborhood, profile?.visible_zone_name])

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
          label: task.location_label || 'Ubicación guardada',
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

  const pageTitle = isEditing ? 'Editar solicitud' : 'Pedir ayuda'
  const pageHeading = isEditing ? 'Edita tu solicitud' : 'Nueva solicitud'

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
        location={effectiveLocation}
        requestLocation={requestLocation}
      />
    </main>
  )
}
