import { queryClient } from '../lib/queryClient'
import { useHomeUiStore } from '../stores/useHomeUiStore'
import { useTaskFiltersStore } from '../stores/useTaskFiltersStore'
import { clearHelperHomeIntent } from '../features/helper-onboarding/services/helperIntentStorage'
import { clearHelperJourneyProgress } from '../features/helper-onboarding/services/helperJourneyStorage'
import { clearAllHelperOnboardingProgress } from '../features/helper-onboarding/services/helperOnboardingProgress'

export function clearClientSessionState() {
  queryClient.clear()
  useTaskFiltersStore.getState().reset()
  useHomeUiStore.getState().resetHomeUi()
  clearHelperHomeIntent()
  clearHelperJourneyProgress()
  clearAllHelperOnboardingProgress()
}
