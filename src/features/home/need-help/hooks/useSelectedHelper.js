import { useCallback, useMemo, useState } from 'react'

export function useSelectedHelper(helpers = []) {
  const [selectedHelperId, setSelectedHelperId] = useState(null)

  const selectedHelper = useMemo(
    () => helpers.find((helper) => helper.id === selectedHelperId) || null,
    [helpers, selectedHelperId],
  )

  const selectHelper = useCallback((helper) => {
    setSelectedHelperId(helper?.id || null)
  }, [])

  const clearSelectedHelper = useCallback(() => {
    setSelectedHelperId(null)
  }, [])

  return {
    selectedHelperId,
    selectedHelper,
    selectHelper,
    clearSelectedHelper,
  }
}
