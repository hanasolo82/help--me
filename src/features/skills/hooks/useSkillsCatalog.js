import { useQuery } from '@tanstack/react-query'
import { getSkillsCatalog } from '../../profile/api/profileApi'

export function useSkillsCatalog() {
  return useQuery({
    queryKey: ['skills-catalog'],
    queryFn: getSkillsCatalog,
    staleTime: 5 * 60 * 1000,
  })
}

