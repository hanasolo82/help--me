import { useEffect } from 'react'
import MyRequestCard from './MyRequestCard'
import styles from './MyRequestsDrawer.module.css'

const SECTIONS = [
  { key: 'open', title: 'Activas', statuses: ['open'] },
  { key: 'in-progress', title: 'En curso', statuses: ['assigned', 'in_progress'] },
  { key: 'history', title: 'Historial', statuses: ['completed', 'closed', 'cancelled'] },
]

function groupTasks(tasks = [], statuses) {
  return tasks.filter((task) => statuses.includes(task.status))
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
          <h2>Detalle completo</h2>
          <p className="muted">Activas, en curso y todo tu historial en un solo lugar.</p>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Volver a requester home">
          ×
        </button>
      </header>

      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const sectionTasks = groupTasks(tasks, section.statuses)

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
