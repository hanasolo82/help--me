import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useTaskById } from '../../hooks/useTaskById'
import { createTaskReview, getMyReviewForTask } from '../../features/reviews/api/reviewsApi'
import { getAvatarInitial } from '../../utils/avatar'
import UserAvatar from '../../shared/ui/UserAvatar'
import styles from './TaskReviewPage.module.css'

const REVIEW_TAGS = [
  'Puntual',
  'Buena comunicación',
  'Trabajo bien hecho',
  'Amable',
  'Recomendable',
]

function getProfileName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Helper'
}

export default function TaskReviewPage() {
  const { id: taskId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { task, loading, error } = useTaskById(taskId)
  const [rating, setRating] = useState(0)
  const [selectedTags, setSelectedTags] = useState([])
  const [comment, setComment] = useState('')

  const isRequester = Boolean(task) && user?.id === task.created_by
  const helperProfile = task?.accepted_profile || null
  const helperName = getProfileName(helperProfile)
  const canReviewTask = Boolean(task) && isRequester && Boolean(task.accepted_by) && ['completed', 'closed'].includes(task.status)

  const existingReviewQuery = useQuery({
    queryKey: ['task-review', taskId, task?.accepted_by || null],
    queryFn: () => getMyReviewForTask(taskId, task.accepted_by),
    enabled: canReviewTask,
    staleTime: 30_000,
  })

  const reviewMutation = useMutation({
    mutationFn: () => createTaskReview({
      taskId: task.id,
      reviewedUserId: task.accepted_by,
      rating,
      tags: selectedTags,
      comment,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-review', taskId, task?.accepted_by || null] }),
        queryClient.invalidateQueries({ queryKey: ['task-reviews', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['profile-reviews', task?.accepted_by] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['task', taskId] }),
      ])
      navigate(`/task/${taskId}`, { replace: true, state: { reviewSaved: true } })
    },
  })

  function toggleTag(tag) {
    setSelectedTags((current) => (
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : [...current, tag]
    ))
  }

  function handleSubmit(event) {
    event.preventDefault()

    if (rating < 1) return

    reviewMutation.mutate()
  }

  if (loading) {
    return (
      <main className="app-screen center-screen">
        <p className="muted">Cargando tarea...</p>
      </main>
    )
  }

  if (!task) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <h1>No encontramos esta tarea</h1>
          <p className="auth-message error">{error || 'Puede que ya no este disponible.'}</p>
          <button type="button" className="secondary-action" onClick={() => navigate('/home')}>
            Volver al home
          </button>
        </section>
      </main>
    )
  }

  if (!canReviewTask) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <p className="eyebrow">Valoración</p>
          <h1>Aún no se puede valorar</h1>
          <p className="muted">
            Las valoraciones se activan cuando la tarea está completada o cerrada por el requester.
          </p>
          <button type="button" className="secondary-action" onClick={() => navigate(`/task/${task.id}`)}>
            Volver al detalle
          </button>
        </section>
      </main>
    )
  }

  if (existingReviewQuery.data) {
    return (
      <main className="app-screen center-screen">
        <section className="completion-panel">
          <p className="eyebrow">Valoración enviada</p>
          <h1>Esta tarea ya está valorada</h1>
          <p className="muted">Gracias por ayudar a construir la reputación de HelpMe.</p>
          <button type="button" className="primary-action" onClick={() => navigate(`/task/${task.id}`)}>
            Volver al detalle
          </button>
        </section>
      </main>
    )
  }

  const helperInitial = getAvatarInitial(helperName)

  return (
    <main className="app-screen center-screen">
      <form className={styles.panel} onSubmit={handleSubmit}>
        <header className={styles.header}>
          <p className="eyebrow">Valoración</p>
          <h1>Valora a {helperName}</h1>
          <p className="muted">Tu opinión aparecerá en su perfil público cuando se guarde.</p>
        </header>

        <section className={styles.summary}>
          <UserAvatar
            src={helperProfile?.avatar_url}
            name={helperName || helperInitial}
            alt={helperName}
            size="md"
            variant="rounded"
            className={styles.avatar}
          />
          <div>
            <strong>{helperName}</strong>
            <p className="muted">{task.title}</p>
          </div>
        </section>

        <fieldset className={styles.fieldset}>
          <legend>Puntuación general</legend>
          <div className={styles.stars} role="radiogroup" aria-label="Puntuación general">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.star} ${value <= rating ? styles.starActive : ''}`.trim()}
                onClick={() => setRating(value)}
                aria-pressed={value <= rating}
                aria-label={`${value} estrellas`}
              >
                ★
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>¿Qué destacarías?</legend>
          <div className={styles.chips}>
            {REVIEW_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`${styles.chip} ${selectedTags.includes(tag) ? styles.chipActive : ''}`.trim()}
                onClick={() => toggleTag(tag)}
                aria-pressed={selectedTags.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </fieldset>

        <label className={styles.commentField}>
          <span>Comentario opcional</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={600}
            rows={4}
            placeholder="Cuenta brevemente cómo fue la ayuda."
          />
        </label>

        {reviewMutation.error && (
          <p className="auth-message error">
            {reviewMutation.error.message || 'No pudimos guardar la valoración.'}
          </p>
        )}

        <div className="two-actions">
          <button type="button" className="secondary-action" onClick={() => navigate(`/task/${task.id}`)}>
            Ahora no
          </button>
          <button type="submit" className="primary-action" disabled={rating < 1 || reviewMutation.isPending}>
            {reviewMutation.isPending ? 'Guardando...' : 'Publicar valoración'}
          </button>
        </div>
      </form>
    </main>
  )
}
