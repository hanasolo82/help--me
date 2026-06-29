import { useMemo } from 'react'
import { useTaskFiltersStore } from '../../../stores/useTaskFiltersStore'
import { allowedCategories } from '../../../services/tasksService'

const categories = ['Todas', ...allowedCategories]

export function useHomeFilters() {
  const { mode, category, setMode, setCategory } = useTaskFiltersStore()
  const isHelperMode = mode === 'help'

  return useMemo(
    () => ({
      mode,
      category,
      setMode,
      setCategory,
      isHelperMode,
      categories,
    }),
    [category, isHelperMode, mode, setCategory, setMode],
  )
}
