import { useMemo } from 'react'
import { getStepStatus, isStepCompleted } from '../utils/helperOnboardingState'

const HELPER_STEPS = ['welcome', 'basic-profile', 'location', 'skills', 'availability', 'phone', 'identity', 'terms']

export function useHelperOnboardingProgress(profile) {
  return useMemo(() => {
    const verificationState = {
      profileVerifications: profile?.profile_verifications || null,
      skills: Array.isArray(profile?.skills) ? profile.skills : [],
      availability: Array.isArray(profile?.availability) ? profile.availability : [],
      phoneContact: {
        phoneNumber: profile?.phone_number || '',
        phoneStatus: profile?.phone_number ? 'provided' : 'not_provided',
      },
    }

    const stripeState = {
      stripe_onboarding_completed: Boolean(profile?.stripe_onboarding_completed),
      stripe_charges_enabled: Boolean(profile?.stripe_charges_enabled),
      stripe_payouts_enabled: Boolean(profile?.stripe_payouts_enabled),
    }

    const checklist = HELPER_STEPS.map((step) => ({
      label:
        step === 'welcome'
          ? 'Inicio'
          : step === 'basic-profile'
            ? 'Perfil base'
            : step === 'location'
              ? 'Ubicación'
              : step === 'skills'
                ? 'Skills'
                : step === 'availability'
                  ? 'Disponibilidad'
                  : step === 'phone'
                    ? 'Teléfono'
                    : step === 'identity'
                      ? 'Stripe'
                      : 'Normas',
      done: isStepCompleted(profile, verificationState, stripeState, step),
      status: getStepStatus(profile, verificationState, stripeState, step),
    }))

    const actionableChecklist = checklist.filter((item) => item.label !== 'Inicio')
    const completed = actionableChecklist.filter((item) => item.done).length
    const progress = Math.round((completed / Math.max(actionableChecklist.length, 1)) * 100)

    return {
      checklist,
      progress,
      pendingCount: actionableChecklist.filter((item) => item.status === 'pending').length,
      reviewCount: actionableChecklist.filter((item) => item.status === 'review').length,
      completeCount: completed,
      helperStatus: profile?.helper_status || 'not_started',
    }
  }, [profile])
}
