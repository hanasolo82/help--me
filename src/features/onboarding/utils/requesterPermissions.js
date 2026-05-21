function hasRequesterBasics(profile) {
  return Boolean(
    profile?.requester_profile_completed ||
      profile?.display_name ||
      profile?.full_name ||
      profile?.username,
  )
}

export function canRequestHelp(profile) {
  return Boolean(profile && profile.account_status === 'active' && hasRequesterBasics(profile))
}

export function canCreateTask(profile) {
  return canRequestHelp(profile)
}

export function needsRequesterProfile(profile) {
  return !canRequestHelp(profile)
}
