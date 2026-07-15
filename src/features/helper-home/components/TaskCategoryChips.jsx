import { useMemo, useState } from 'react'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../../shared/ui/Modal/Modal'
import { CategoryIcon, style as designStyle } from '../../../design'
import { cleanCategoryLabel } from '../../home/need-help/config/helperCategoryFilters'
import styles from '../styles/helperHome.module.css'

const ALL_CATEGORY = 'Todas'
const DEFAULT_VISIBLE_COUNT = 4

function buildDomId(value) {
  return String(value || ALL_CATEGORY)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

// Chips de categoría superpuestos sobre el mapa del helper. Mismo patrón que
// MapCategoryChips del requester (barra configurable + modal "Chips visibles"),
// pero con filtro de selección única (category / onChange, ya aplicado upstream
// en useTasks). "Todas" siempre visible; la categoría activa se mantiene
// visible aunque esté oculta, para no perder de vista el filtro en uso.
export default function TaskCategoryChips({ category = ALL_CATEGORY, categories = [], onChange }) {
  const options = categories.length > 0 ? categories : [ALL_CATEGORY]
  const selectableOptions = useMemo(
    () => options.filter((option) => option !== ALL_CATEGORY),
    [options],
  )
  const activeCategory = options.includes(category) ? category : ALL_CATEGORY

  const [visibleCategories, setVisibleCategories] = useState(
    () => selectableOptions.slice(0, DEFAULT_VISIBLE_COUNT),
  )
  const [filtersOpen, setFiltersOpen] = useState(false)

  const visibleSet = useMemo(() => new Set(visibleCategories), [visibleCategories])
  const barOptions = options.filter(
    (option) =>
      option === ALL_CATEGORY ||
      visibleSet.has(option) ||
      option === activeCategory,
  )
  const hiddenCount = selectableOptions.filter(
    (option) => !visibleSet.has(option) && option !== activeCategory,
  ).length
  const filtersButtonLabel = hiddenCount > 0 ? '+ Filtros' : '- Filtros'

  function toggleVisibleCategory(option) {
    setVisibleCategories((current) =>
      current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    )
  }

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
    <>
      <div className={styles.mapCategoryOverlay}>
        <div className={styles.mapCategoryScroller} role="group" aria-label="Filtro de categorías del mapa">
          {barOptions.map((option) => {
            const isActive = option === activeCategory
            const label = option === ALL_CATEGORY ? ALL_CATEGORY : cleanCategoryLabel(option)

            return (
              <button
                key={option}
                id={`task-category-${buildDomId(option)}`}
                type="button"
                className={isActive ? `${styles.mapCategoryChip} ${styles.mapCategoryChipActive}` : styles.mapCategoryChip}
                aria-pressed={isActive}
                data-map-category-chip="true"
                onClick={() => onChange?.(option)}
                onKeyDown={handleKeyDown}
              >
                <CategoryIcon
                  category={option}
                  size={designStyle.iconSize.chip}
                  tone={isActive ? 'dark' : 'light'}
                />
                {label}
              </button>
            )
          })}

          <span className={styles.mapCategorySeparator} aria-hidden="true" />
          <button
            type="button"
            className={styles.mapCategoryMore}
            onClick={() => setFiltersOpen(true)}
            aria-label={hiddenCount > 0 ? `Gestionar filtros: ${hiddenCount} ocultos` : 'Gestionar filtros visibles'}
          >
            {filtersButtonLabel}
          </button>
        </div>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        size="sm"
        ariaLabel="Gestionar filtros visibles"
      >
        <ModalHeader eyebrow="Mapa" title="Chips visibles" closeLabel="Cerrar filtros">
          <p className="muted">Añade o quita categorías de la barra. La categoría activa se mantiene siempre visible.</p>
        </ModalHeader>
        <ModalBody className={styles.mapFilterModalBody}>
          <div className={styles.mapFilterOptions} role="group" aria-label="Categorías visibles en el mapa">
            {selectableOptions.map((option) => {
              const isVisible = visibleSet.has(option) || option === activeCategory
              const isActive = option === activeCategory

              return (
                <button
                  key={option}
                  type="button"
                  className={isVisible ? `${styles.mapFilterOption} ${styles.mapFilterOptionOn}` : styles.mapFilterOption}
                  role="switch"
                  aria-checked={isVisible}
                  disabled={isActive}
                  onClick={() => toggleVisibleCategory(option)}
                >
                  <span>
                    <strong>{cleanCategoryLabel(option)}</strong>
                    {isActive ? <small>Filtro activo</small> : <small>{isVisible ? 'Visible' : 'Oculto'}</small>}
                  </span>
                  <span className={styles.mapFilterOptionSwitch} aria-hidden="true">
                    <span />
                  </span>
                </button>
              )
            })}
          </div>
        </ModalBody>
        <ModalActions>
          <button type="button" className="secondary-action" onClick={() => setFiltersOpen(false)}>
            Listo
          </button>
        </ModalActions>
      </Modal>
    </>
  )
}
