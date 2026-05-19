import { useEffect, useMemo } from 'react'
import { useTaskFiltersStore } from '../../../stores/useTaskFiltersStore'

const categories = ['Todas', 'Mascotas', 'Recados', 'Compras', 'Ayuda tecnica']
const radiusOptions = [1, 3, 5, 10, 50]

export function useHomeFilters(profile) {
  const { mode, category, radius, setMode, setCategory, setRadius } = useTaskFiltersStore()

  useEffect(() => {
    if (Number.isFinite(profile?.search_radius_km)) {
      setRadius(profile.search_radius_km)
    }
  }, [profile?.search_radius_km, setRadius])

  const isHelperMode = mode === 'help'
  const helperTitle = isHelperMode ? 'Tareas cerca de ti' : 'Tareas solicitadas'
  const helperSubtitle = isHelperMode ? `${radius} km · ${category}` : 'Publica cada borrador cuando quieras mostrarlo'

  return useMemo(
    () => ({
      mode,
      category,
      radius,
      setMode,
      setCategory,
      setRadius,
      isHelperMode,
      helperTitle,
      helperSubtitle,
      categories,
      radiusOptions,
    }),
    [
      category,
      helperSubtitle,
      helperTitle,
      isHelperMode,
      mode,
      radius,
      setCategory,
      setMode,
      setRadius,
    ],
  )
}
