import { useMemo, useState } from 'react'
import {
  ALL_HELPER_CATEGORY_ID,
  buildMapCategoryFilters,
  cleanCategoryLabel,
} from '../config/helperCategoryFilters'
import styles from './NeedHelpMapLayout.module.css'

function buildDomId(value) {
  return String(value || ALL_HELPER_CATEGORY_ID)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function focusSiblingChip(event, direction) {
  const chips = [...event.currentTarget.parentElement.querySelectorAll('[data-map-category-chip="true"]')]
  const currentIndex = chips.indexOf(event.currentTarget)
  if (currentIndex === -1) return

  const nextIndex = (currentIndex + direction + chips.length) % chips.length
  chips[nextIndex]?.focus()
}

export default function MapCategoryChips({
  filters = [],
  selectedSkillId = ALL_HELPER_CATEGORY_ID,
  onSkillChange,
}) {
  const [expanded, setExpanded] = useState(false)
  const selectedId = selectedSkillId || ALL_HELPER_CATEGORY_ID
  const options = useMemo(() => {
    const nextOptions = buildMapCategoryFilters(filters)

    if (selectedId !== ALL_HELPER_CATEGORY_ID && !nextOptions.some((option) => option.id === selectedId)) {
      nextOptions.push({
        id: selectedId,
        label: cleanCategoryLabel(selectedId),
        defaultVisible: true,
      })
    }

    return nextOptions
  }, [filters, selectedId])

  const visibleOptions = options.filter((option) => expanded || option.defaultVisible || option.id === selectedId)
  const hiddenCount = options.length - visibleOptions.length

  function handleKeyDown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusSiblingChip(event, 1)
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusSiblingChip(event, -1)
    }
  }

  return (
    <div className={styles.mapCategoryOverlay}>
      <div className={styles.mapCategoryScroller} role="tablist" aria-label="Filtro de categorías del mapa">
        {visibleOptions.map((option) => {
          const isActive = option.id === selectedId

          return (
            <button
              key={option.id}
              id={`map-category-${buildDomId(option.id)}`}
              type="button"
              role="tab"
              className={isActive ? `${styles.mapCategoryChip} ${styles.mapCategoryChipActive}` : styles.mapCategoryChip}
              aria-selected={isActive}
              aria-pressed={isActive}
              tabIndex={isActive ? 0 : -1}
              data-map-category-chip="true"
              onClick={() => onSkillChange?.(option.id)}
              onKeyDown={handleKeyDown}
            >
              {option.label}
            </button>
          )
        })}

        {!expanded && hiddenCount > 0 ? (
          <>
            <span className={styles.mapCategorySeparator} aria-hidden="true" />
            <button
              type="button"
              className={styles.mapCategoryMore}
              onClick={() => setExpanded(true)}
              aria-label={`Mostrar ${hiddenCount} filtros de categoría más`}
            >
              + Filtros
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
