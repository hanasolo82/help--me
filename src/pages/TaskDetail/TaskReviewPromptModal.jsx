import { useEffect, useId, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import {
  createTaskReview,
  getMyReviewForTask,
} from '../../features/reviews/api/reviewsApi'
import Modal from '../../shared/ui/Modal/Modal'
import UserAvatar from '../../shared/ui/UserAvatar'
import ActionStatusOverlay from '../../shared/ui/ActionStatusOverlay/ActionStatusOverlay'
import styles from './TaskReviewPromptModal.module.css'

function getProfileName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Helper'
}

export default function TaskReviewPromptModal({ task }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const titleId = useId()
  const descriptionId = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [outcome, setOutcome] = useState('')
  const helperProfile = task?.accepted_profile || {}
  const helperName = getProfileName(helperProfile)

  const existingReviewQuery = useQuery({
    queryKey: ['task-review', task.id, task.accepted_by],
    queryFn: () => getMyReviewForTask(task.id, task.accepted_by),
    enabled: Boolean(task?.accepted_by),
    staleTime: 30_000,
  })

  const reviewMutation = useMutation({
    mutationFn: () => createTaskReview({
      taskId: task.id,
      reviewedUserId: task.accepted_by,
      rating,
      comment,
    }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-review', task.id, task.accepted_by] }),
        queryClient.invalidateQueries({ queryKey: ['task-review-status', task.id, task.accepted_by] }),
        queryClient.invalidateQueries({ queryKey: ['task-reviews', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['profile-reviews', task.accepted_by] }),
        queryClient.invalidateQueries({ queryKey: ['my-tasks', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['task', task.id] }),
      ])
      setOutcome('published')
    },
  })

  useEffect(() => {
    if (!outcome) return undefined

    const timer = window.setTimeout(() => {
      navigate('/home', { replace: true })
    }, 1600)

    return () => window.clearTimeout(timer)
  }, [navigate, outcome])

  if (typeof document === 'undefined') {
    return null
  }

  const reviewAlreadyPublished = Boolean(existingReviewQuery.data)
  const showThanks = outcome || reviewAlreadyPublished

  // Cerrar (Esc/fondo) equivale a "Ahora no": registra el skip y vuelve al inicio.
  function handleDismiss() {
    if (!outcome && !reviewAlreadyPublished) {
      setOutcome('skipped')
      return
    }
    navigate('/home', { replace: true })
  }

  return (
    <>
      <Modal open onClose={handleDismiss} size="md" labelledBy={titleId} describedBy={descriptionId}>
          {showThanks ? (
            <div className={styles.thanks} aria-live="polite">
              <p className="eyebrow">
                {outcome === 'published' || reviewAlreadyPublished
                  ? 'Valoración publicada'
                  : 'Tarea cerrada'}
              </p>
              <h2 id={titleId}>Gracias por usar HelpMe</h2>
              <p id={descriptionId} className="muted">
                {outcome === 'published' || reviewAlreadyPublished
                  ? 'Tu valoración ya forma parte del perfil del helper.'
                  : 'La tarea ha quedado completada. Puedes valorar al helper más adelante desde el detalle.'}
              </p>
              <button type="button" className="primary-action" onClick={() => navigate('/home', { replace: true })}>
                Volver al inicio
              </button>
            </div>
          ) : existingReviewQuery.isLoading ? (
            <div className={styles.thanks} aria-live="polite">
              <p className="muted">Comprobando valoración...</p>
            </div>
          ) : (
            <>
              <header className={styles.header}>
                <p className="eyebrow">Tarea completada</p>
                <h2 id={titleId}>¿Quieres valorar a {helperName}?</h2>
                <p id={descriptionId} className="muted">
                  Tu opinión ayuda a otros requesters a elegir con confianza. La valoración será visible en el perfil
                  del helper.
                </p>
              </header>

              <div className={styles.helper}>
                <UserAvatar
                  src={helperProfile.avatar_url}
                  name={helperName}
                  alt={helperName}
                  size="md"
                  variant="rounded"
                />
                <div>
                  <strong>{helperName}</strong>
                  <p className="muted">{task.title}</p>
                </div>
              </div>

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

              <label className={styles.comment}>
                <span>Comentario opcional</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={600}
                  rows={4}
                  placeholder="Cuenta brevemente cómo fue la ayuda."
                />
              </label>

              {existingReviewQuery.error || reviewMutation.error ? (
                <p className="auth-message error" role="alert">
                  {reviewMutation.error?.message ||
                    existingReviewQuery.error?.message ||
                    'No pudimos comprobar o guardar la valoración.'}
                </p>
              ) : null}

              <div className="two-actions">
                <button type="button" className="secondary-action" onClick={() => setOutcome('skipped')}>
                  Ahora no
                </button>
                <button
                  type="button"
                  className="primary-action"
                  disabled={rating < 1 || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                >
                  Publicar valoración
                </button>
              </div>
            </>
          )}
      </Modal>
      <ActionStatusOverlay
        open={reviewMutation.isPending}
        title="Publicando valoración..."
        message="Estamos guardando tu opinión en el perfil del helper."
      />
    </>
  )
}
