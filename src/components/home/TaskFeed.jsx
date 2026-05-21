import styles from '../../pages/Home/Home.module.css'
import { canEditTask } from '../../services/tasksService'
import TaskCard from './TaskCard'
import HomeEmptyState from '../../features/home/components/HomeEmptyState'

const TASK_CANCELABLE_STATUSES = new Set(['draft', 'open', 'assigned', 'in_progress'])

export default function TaskFeed({
  title,
  subtitle,
  actionLabel,
  onAction,
  tasks,
  loading,
  error,
  count,
  isHelperMode,
  currentUserId,
  expandedTaskIds,
  publishingTaskId,
  distancesById,
  onToggleTaskDetails,
  onPublishTask,
  onCancelTask,
  onOpenTaskChat,
  onEditTask,
}) {
  return (
    <section className={styles.tasksContainer}>
      <div className={styles.sectionTitle}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className={styles.titleActions}>
          {actionLabel && (
            <button type="button" className={styles.mapButton} onClick={onAction}>
              {actionLabel}
            </button>
          )}
          <span>{count}</span>
        </div>
      </div>

      {loading && <p className="muted">Cargando tareas...</p>}
      {error && !loading && <p className="auth-message error">{error}</p>}

      <div className={styles.taskGrid}>
        {(tasks || []).map(({ task, distance }) => {
          const isDraftTask = !isHelperMode && task.status === 'draft'
          const showDistance = isHelperMode
          const showCancelAction = !isHelperMode && TASK_CANCELABLE_STATUSES.has(task.status)
          const showEditAction = !isHelperMode && canEditTask(task)
          const showChatAction =
            (isHelperMode && task.status === 'open' && task.created_by !== currentUserId) ||
            (!isHelperMode &&
              Boolean(task.accepted_by) &&
              ['assigned', 'in_progress', 'completed'].includes(task.status))

          return (
            <TaskCard
              key={task.id}
              task={task}
              distanceKm={distance ?? distancesById?.[task.id] ?? null}
              showDistance={showDistance}
              showCancelAction={showCancelAction}
              onCancelAction={() => onCancelTask(task)}
              showEditAction={showEditAction}
              onEditAction={() => onEditTask(task)}
              showChatAction={showChatAction}
              onChatAction={() => onOpenTaskChat(task)}
              expanded={Boolean(expandedTaskIds[task.id])}
              primaryActionLabel={
                isHelperMode
                  ? expandedTaskIds[task.id]
                    ? 'Ocultar'
                    : 'Ver detalle'
                  : isDraftTask
                    ? publishingTaskId === task.id
                      ? 'Publicando...'
                      : 'Publicar tarea'
                    : null
              }
              primaryActionVariant="primary"
              primaryActionDisabled={!isHelperMode && publishingTaskId === task.id}
              onPrimaryAction={() => {
                if (isHelperMode) {
                  onToggleTaskDetails(task.id)
                  return
                }

                if (isDraftTask) {
                  onPublishTask(task)
                }
              }}
              secondaryActionLabel={
                !isHelperMode && expandedTaskIds[task.id] ? 'Ocultar' : !isHelperMode ? 'Ver detalle' : null
              }
              secondaryActionVariant="link"
              onSecondaryAction={() => onToggleTaskDetails(task.id)}
            />
          )
        })}
      </div>

      {!loading && !error && (tasks || []).length === 0 && (
        <HomeEmptyState
          title={isHelperMode ? 'No hay tareas con estos filtros' : 'Aun no tienes tareas solicitadas'}
          description={
            isHelperMode
              ? 'Amplia el radio o cambia el tipo de actividad para ver mas oportunidades.'
              : 'Pulsa "Nueva tarea" para pedir tu primera ayuda.'
          }
          actionLabel={!isHelperMode && onAction ? 'Nueva tarea' : null}
          onAction={!isHelperMode ? onAction : undefined}
          tone={isHelperMode ? 'warning' : 'positive'}
        />
      )}
    </section>
  )
}
