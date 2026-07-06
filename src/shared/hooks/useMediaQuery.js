import { useCallback, useSyncExternalStore } from 'react'

/**
 * Media query reactiva: true/false según `window.matchMedia(query)`.
 * Implementada con useSyncExternalStore (sin estado duplicado ni efectos).
 *
 *   const isNarrow = useMediaQuery('(max-width: 640px)')
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      const mediaQueryList = window.matchMedia(query)
      mediaQueryList.addEventListener('change', notify)
      return () => mediaQueryList.removeEventListener('change', notify)
    },
    [query],
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
