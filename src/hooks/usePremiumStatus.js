import { useQuery } from '@tanstack/react-query'
import { getMyPremiumStatus } from '../services/billingService'

/**
 * Estado premium del usuario (misma fuente que los gates del backend).
 * Devuelve { isPremium, isLoading, refetch }.
 */
export function usePremiumStatus(userId) {
  const query = useQuery({
    queryKey: ['premium-status', userId],
    queryFn: () => getMyPremiumStatus(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })

  return {
    isPremium: Boolean(query.data?.active),
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}
