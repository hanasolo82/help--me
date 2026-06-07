import { useMemo } from 'react'
import { useTaskFiltersStore } from '../../../stores/useTaskFiltersStore'

const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']

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
