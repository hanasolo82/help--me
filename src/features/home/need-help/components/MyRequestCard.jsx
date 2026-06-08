import styles from './MyRequestCard.module.css'

const STATUS_COPY = {
  open: 'Activa',
  assigned: 'Pendiente de pago',
  in_progress: 'En curso',
  completed: 'Completada',
  closed: 'Cerrada',
  cancelled: 'Cancelada',
  draft: 'Borrador',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin fecha'

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export default function MyRequestCard({
  task,
  onFocusMap,
  onEdit,
  onRetire,
  onOpenChat,
  onOpenDetail,
  onOpenPayment,
  onOpenSummary,
  onReview,
}) {
  const statusLabel = STATUS_COPY[task.status] || task.status
  const dateLabel = formatDate(task.cancelled_at || task.published_at || task.modified_at || task.updated_at || task.created_at)
  const isPendingPayment = task.status === 'assigned'

  return (
    <article className={`${styles.card} ${isPendingPayment ? styles.pendingPaymentCard : ''}`.trim()}>
      <div className={styles.header}>
        <div>
          <p className={styles.title}>{task.title}</p>
          <p className={styles.meta}>{task.category}</p>
        </div>
        <span className={styles.status}>{statusLabel}</span>
      </div>

      <div className={styles.detailRow}>
        <span>{dateLabel}</span>
        <span>{task.price ? `${Number(task.price)} EUR` : 'Precio libre'}</span>
      </div>

      {isPendingPayment ? (
        <p className={styles.paymentNotice}>
          Un helper aceptó tu solicitud. Confirma el pago para activar la tarea y abrir el chat privado.
        </p>
      ) : null}

      <div className={styles.actions}>
        {task.status === 'open' && (
          <>
            <button type="button" className="secondary-action" onClick={() => onFocusMap?.(task)}>
              Ver en mapa
            </button>
            <button type="button" className="secondary-action" onClick={() => onEdit?.(task)}>
              Editar
            </button>
            <button type="button" className="danger-action" onClick={() => onRetire?.(task)}>
              Retirar
            </button>
          </>
        )}

        {task.status === 'assigned' && (
          <>
            <button type="button" className="primary-action" onClick={() => onOpenPayment?.(task)}>
              Pagar y abrir chat
            </button>
            <button type="button" className="secondary-action" onClick={() => onOpenDetail?.(task)}>
              Ver detalle
            </button>
          </>
        )}

        {task.status === 'in_progress' && (
          <>
            <button type="button" className="secondary-action" onClick={() => onOpenChat?.(task)}>
              Ver chat
            </button>
            <button type="button" className="secondary-action" onClick={() => onOpenDetail?.(task)}>
              Ver detalle
            </button>
          </>
        )}

        {['completed', 'closed'].includes(task.status) && (
          <>
            <button type="button" className="secondary-action" onClick={() => onOpenSummary?.(task)}>
              Ver resumen
            </button>
            <button type="button" className="secondary-action" onClick={() => onReview?.(task)}>
              Valorar si aplica
            </button>
          </>
        )}

        {task.status === 'cancelled' && (
          <button type="button" className="secondary-action" onClick={() => onOpenDetail?.(task)}>
            Ver detalle
          </button>
        )}
      </div>
    </article>
  )
}
