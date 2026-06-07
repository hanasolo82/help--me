import CategoryFilter from '../../../../components/home/CategoryFilter'
import styles from '../../need-help/components/NeedHelpMapLayout.module.css'

export default function TaskFiltersBar({
  category,
  onCategoryChange,
  categories = [],
  taskCount = 0,
  visibleCount = 0,
  eyebrow = 'Ofrezco ayuda',
  title = 'Tareas visibles en tu zona',
  lead = 'Explora tareas cercanas, cambia filtros y elige una oportunidad para ayudar.',
}) {
  return (
    <div className={styles.filtersBar}>
      <div className={styles.filtersHeader}>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="muted">{lead}</p>
      </div>

      <div className={styles.filtersBlock}>
        <CategoryFilter category={category} onChange={onCategoryChange} options={categories} />
      </div>

      <div className={styles.panelMeta}>
        <strong>{taskCount} tareas disponibles</strong>
        <p className="muted">
          {visibleCount} visibles en esta pantalla del mapa
          {taskCount !== visibleCount ? ` · ${taskCount} en total con estos filtros` : ''}
        </p>
      </div>
    </div>
  )
}
