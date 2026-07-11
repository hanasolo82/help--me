import { useMemo, useState } from 'react'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../../../shared/ui/Modal/Modal'
import {
  ALL_HELPER_CATEGORY_ID,
  buildMapCategoryFilters,
  cleanCategoryLabel,
  getDefaultVisibleMapCategoryIds,
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
  selectedSkillIds = [],
  onSelectedSkillIdsChange,
}) {
  const [visibleCategoryIds, setVisibleCategoryIds] = useState(() => getDefaultVisibleMapCategoryIds())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const selectedIds = useMemo(
    () =>
      Array.isArray(selectedSkillIds)
        ? selectedSkillIds.filter((item) => item && item !== ALL_HELPER_CATEGORY_ID)
        : [],
    [selectedSkillIds],
  )
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const allSelected = selectedIds.length === 0
  const options = useMemo(() => {
    const nextOptions = buildMapCategoryFilters(filters)

    for (const selectedId of selectedIds) {
      if (nextOptions.some((option) => option.id === selectedId)) continue

      nextOptions.push({
        id: selectedId,
        label: cleanCategoryLabel(selectedId),
        defaultVisible: false,
      })
    }

    return nextOptions
  }, [filters, selectedIds])

  const selectableOptions = options.filter((option) => option.id !== ALL_HELPER_CATEGORY_ID)
  const visibleIdSet = useMemo(() => new Set(visibleCategoryIds), [visibleCategoryIds])
  const visibleOptions = options.filter(
    (option) =>
      option.id === ALL_HELPER_CATEGORY_ID ||
      visibleIdSet.has(option.id) ||
      selectedIdSet.has(option.id),
  )
  const hiddenCount = selectableOptions.filter(
    (option) => !visibleIdSet.has(option.id) && !selectedIdSet.has(option.id),
  ).length
  const filtersButtonLabel = hiddenCount > 0 ? '+ Filtros' : '- Filtros'

  function selectAll() {
    onSelectedSkillIdsChange?.([])
  }

  function toggleCategory(categoryId) {
    if (categoryId === ALL_HELPER_CATEGORY_ID) {
      selectAll()
      return
    }

    const nextSelectedIds = selectedIdSet.has(categoryId)
      ? selectedIds.filter((item) => item !== categoryId)
      : [...selectedIds, categoryId]

    onSelectedSkillIdsChange?.(nextSelectedIds)
  }

  function toggleVisibleCategory(categoryId) {
    if (categoryId === ALL_HELPER_CATEGORY_ID) return

    const isVisible = visibleIdSet.has(categoryId) || selectedIdSet.has(categoryId)
    const nextVisibleIds = isVisible
      ? visibleCategoryIds.filter((item) => item !== categoryId)
      : [...visibleCategoryIds, categoryId]

    setVisibleCategoryIds(nextVisibleIds)

    if (isVisible && selectedIdSet.has(categoryId)) {
      onSelectedSkillIdsChange?.(selectedIds.filter((item) => item !== categoryId))
    }
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
          {visibleOptions.map((option) => {
            const isActive = option.id === ALL_HELPER_CATEGORY_ID ? allSelected : selectedIdSet.has(option.id)

            return (
              <button
                key={option.id}
                id={`map-category-${buildDomId(option.id)}`}
                type="button"
                className={isActive ? `${styles.mapCategoryChip} ${styles.mapCategoryChipActive}` : styles.mapCategoryChip}
                aria-pressed={isActive}
                data-map-category-chip="true"
                onClick={() => toggleCategory(option.id)}
                onKeyDown={handleKeyDown}
              >
                {option.label}
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
          <p className="muted">Añade o quita categorías de la barra. Las categorías activas se mantienen visibles.</p>
        </ModalHeader>
        <ModalBody className={styles.mapFilterModalBody}>
          <div className={styles.mapFilterOptions} role="group" aria-label="Categorías visibles en el mapa">
            {selectableOptions.map((option) => {
              const isVisible = visibleIdSet.has(option.id) || selectedIdSet.has(option.id)
              const isActive = selectedIdSet.has(option.id)

              return (
                <button
                  key={option.id}
                  type="button"
                  className={isVisible ? `${styles.mapFilterOption} ${styles.mapFilterOptionOn}` : styles.mapFilterOption}
                  role="switch"
                  aria-checked={isVisible}
                  onClick={() => toggleVisibleCategory(option.id)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    {isActive ? <small>Activo en el mapa</small> : <small>{isVisible ? 'Visible' : 'Oculto'}</small>}
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
