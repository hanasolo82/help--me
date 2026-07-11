import { useEffect } from 'react'
import MyRequestCard from './MyRequestCard'
import { isTaskTimeWindowExpired } from '../../../tasks/availability/taskAvailability'
import styles from './MyRequestsDrawer.module.css'

const SECTIONS = [
  { key: 'open', title: 'Publicadas', matches: (task) => task.status === 'open' && !isTaskTimeWindowExpired(task) },
  { key: 'pending-confirmation', title: 'Ofertas pendientes', matches: (task) => task.status === 'assigned' },
  { key: 'in-progress', title: 'En curso', matches: (task) => task.status === 'in_progress' },
  { key: 'expired', title: 'Plazo finalizado', matches: (task) => task.status === 'open' && isTaskTimeWindowExpired(task) },
  { key: 'history', title: 'Historial', matches: (task) => ['completed', 'closed', 'cancelled'].includes(task.status) },
]

function groupTasks(tasks = [], section) {
  return tasks.filter(section.matches)
}

export default function MyRequestsDrawer({
  open,
  variant = 'overlay',
  tasks = [],
  onClose,
  onFocusMap,
  onEdit,
  onRetire,
  onOpenChat,
  onOpenDetail,
  onOpenSummary,
  onReview,
  reviewedTaskIds,
}) {
  useEffect(() => {
    if (!open || variant === 'inline') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open, variant])

  if (!open) return null

  const drawer = (
    <section
      className={`${styles.drawer} ${variant === 'inline' ? styles.inlineDrawer : ''}`.trim()}
      role={variant === 'inline' ? 'region' : 'dialog'}
      aria-modal={variant === 'inline' ? undefined : 'true'}
      aria-label="Mis solicitudes"
      onClick={variant === 'inline' ? undefined : (event) => event.stopPropagation()}
    >
      <header className={styles.header}>
        <div>
          <p className="eyebrow">Mis solicitudes</p>
          <h2>Decisiones pendientes</h2>
          <p className="muted">Primero resuelve las ofertas pendientes; el resto queda debajo.</p>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Volver a requester home">
          ×
        </button>
      </header>

      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const sectionTasks = groupTasks(tasks, section)

          return (
            <section key={section.key} className={styles.section}>
              <div className={styles.sectionHeader}>
                <strong>{section.title}</strong>
                <span className={styles.sectionCount}>{sectionTasks.length}</span>
              </div>

              {sectionTasks.length === 0 ? (
                <p className="muted">No hay solicitudes en esta sección.</p>
              ) : (
                <div className={styles.cards}>
                  {sectionTasks.map((task) => (
                    <MyRequestCard
                      key={task.id}
                      task={task}
                      onFocusMap={onFocusMap}
                      onEdit={onEdit}
                      onRetire={onRetire}
                      onOpenChat={onOpenChat}
                      onOpenDetail={onOpenDetail}
                      onOpenSummary={onOpenSummary}
                      onReview={onReview}
                      reviewedTaskIds={reviewedTaskIds}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </section>
  )

  if (variant === 'inline') {
    return drawer
  }

  return (
    <div className={styles.backdrop} role="presentation" onClick={onClose}>
      {drawer}
    </div>
  )
}
