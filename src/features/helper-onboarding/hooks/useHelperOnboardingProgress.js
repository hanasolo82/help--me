import { useMemo } from 'react'

function hasLocation(profile) {
  return Number.isFinite(Number(profile?.lat)) && Number.isFinite(Number(profile?.lng))
}

function hasSkills(profile) {
  return Array.isArray(profile?.skills) ? profile.skills.length > 0 : Boolean(profile?.skills_count || profile?.completed_tasks)
}

function hasTrustSignal(profile) {
  return Boolean(
    profile?.profile_verifications?.email_verified ||
      profile?.profile_verifications?.phone_verified ||
      profile?.profile_verifications?.identity_verified,
  )
}

export function useHelperOnboardingProgress(profile) {
  return useMemo(() => {
    const checklist = [
      { label: 'Perfil base', done: Boolean(profile?.display_name || profile?.full_name || profile?.username) },
      { label: 'Ubicación', done: hasLocation(profile) },
      { label: 'Skills', done: hasSkills(profile) },
      { label: 'Disponibilidad', done: profile?.availability_enabled !== false },
      { label: 'Verificación', done: hasTrustSignal(profile) },
    ]

    const completed = checklist.filter((item) => item.done).length
    const progress = Math.round((completed / checklist.length) * 100)

    return {
      checklist,
      progress,
      helperStatus: profile?.helper_status || 'not_started',
    }
  }, [profile])
}
