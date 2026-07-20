import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import Modal, { ModalActions, ModalBody, ModalHeader } from '../../../../shared/ui/Modal/Modal'
import { CategoryIcon, style as designStyle } from '../../../../design'
import {
  ALL_HELPER_CATEGORY_ID,
  buildMapCategoryFilters,
  cleanCategoryLabel,
  getDefaultVisibleMapCategoryIds,
} from '../config/helperCategoryFilters'
import styles from './NeedHelpMapLayout.module.css'

const SEARCH_COLLAPSE_DURATION_MS = 220
const PILL_SEQUENCE_DURATION_MS = 560

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
  searchOpen = false,
  searchQuery = '',
  onSearchOpenChange,
  onSearchQueryChange,
}) {
  const [visibleCategoryIds, setVisibleCategoryIds] = useState(() => getDefaultVisibleMapCategoryIds())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [searchClosing, setSearchClosing] = useState(false)
  const [pillsEntering, setPillsEntering] = useState(false)
  const searchTriggerRef = useRef(null)
  const searchInputRef = useRef(null)
  const collapseTimerRef = useRef(null)
  const pillTimerRef = useRef(null)
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
  const overlayClasses = [styles.mapCategoryOverlay]

  if (searchOpen) {
    overlayClasses.push(styles.mapCategoryOverlaySearchOpen)
  } else if (searchClosing) {
    overlayClasses.push(styles.mapCategoryOverlaySearchClosing)
  } else if (pillsEntering) {
    overlayClasses.push(styles.mapCategoryOverlayPillsEntering)
  }

  const overlayClassName = overlayClasses.join(' ')
  const filtersHidden = searchOpen || searchClosing

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchOpen])

  useEffect(() => () => {
    window.clearTimeout(collapseTimerRef.current)
    window.clearTimeout(pillTimerRef.current)
  }, [])

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

  function openSearch() {
    window.clearTimeout(collapseTimerRef.current)
    window.clearTimeout(pillTimerRef.current)
    setSearchClosing(false)
    setPillsEntering(false)
    onSearchOpenChange?.(true)
  }

  function closeSearch() {
    if (searchClosing) return

    window.clearTimeout(collapseTimerRef.current)
    window.clearTimeout(pillTimerRef.current)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onSearchQueryChange?.('')
      setSearchClosing(false)
      setPillsEntering(false)
      onSearchOpenChange?.(false)
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus())
      return
    }

    setSearchClosing(true)
    setPillsEntering(false)
    onSearchOpenChange?.(false)

    collapseTimerRef.current = window.setTimeout(() => {
      onSearchQueryChange?.('')
      setSearchClosing(false)
      setPillsEntering(true)
      window.requestAnimationFrame(() => searchTriggerRef.current?.focus())

      pillTimerRef.current = window.setTimeout(() => {
        setPillsEntering(false)
      }, PILL_SEQUENCE_DURATION_MS)
    }, SEARCH_COLLAPSE_DURATION_MS)
  }

  return (
    <>
      <div className={overlayClassName}>
        <div
          className={styles.mapCategoryScroller}
          role="group"
          aria-label="Filtro de categorías del mapa"
          aria-hidden={filtersHidden}
        >
          <button
            ref={searchTriggerRef}
            type="button"
            className={styles.mapSearchOpen}
            onClick={openSearch}
            aria-label="Buscar helpers por habilidad"
            aria-expanded={searchOpen}
            title="Buscar por habilidad"
            tabIndex={filtersHidden ? -1 : undefined}
          >
            <Search aria-hidden="true" strokeWidth={2.2} />
          </button>
          <span className={styles.mapCategorySeparator} aria-hidden="true" />

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
                tabIndex={filtersHidden ? -1 : undefined}
              >
                <CategoryIcon
                  category={option.id}
                  size={designStyle.iconSize.chip}
                  tone={isActive ? 'dark' : 'light'}
                />
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
            tabIndex={filtersHidden ? -1 : undefined}
          >
            {filtersButtonLabel}
          </button>
        </div>

        <div className={styles.mapSearchBar} role="search" aria-label="Buscar helpers por habilidad" aria-hidden={!searchOpen}>
            <Search aria-hidden="true" strokeWidth={2.2} />
            <label className={styles.mapSearchLabel} htmlFor="map-helper-skill-search">
              Buscar por habilidad
            </label>
            <input
              ref={searchInputRef}
              id="map-helper-skill-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchQueryChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeSearch()
              }}
              placeholder="Ej. cortar pelo, montar muebles..."
              maxLength={80}
              autoComplete="off"
              tabIndex={searchOpen ? undefined : -1}
            />
            <button
              type="button"
              className={styles.mapSearchClose}
              onClick={closeSearch}
              aria-label="Volver a los filtros por categoría"
              title="Volver a categorías"
              tabIndex={searchOpen ? undefined : -1}
            >
              <Plus aria-hidden="true" strokeWidth={2.2} />
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
