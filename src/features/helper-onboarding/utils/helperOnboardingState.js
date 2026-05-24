function hasText(value) {
  return Boolean(String(value ?? '').trim())
}

function splitFullName(fullName = '') {
  const normalized = String(fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!normalized) {
    return { firstName: '', lastName: '' }
  }

  const parts = normalized.split(' ')
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
  }
}

function splitPhone(phoneNumber = '') {
  const normalized = String(phoneNumber ?? '').trim()
  if (!normalized) {
    return { phonePrefix: '+34', phoneNumber: '' }
  }

  const digits = normalized.replace(/[^\d+]/g, '')
  if (digits.startsWith('+34')) {
    return {
      phonePrefix: '+34',
      phoneNumber: digits.slice(3).replace(/[^\d]/g, ''),
    }
  }

  return {
    phonePrefix: '+34',
    phoneNumber: digits.replace(/[^\d]/g, ''),
  }
}

export function isFieldCompleted(profile, field) {
  switch (field) {
    case 'full_name':
    case 'display_name':
    case 'username':
      return hasText(profile?.display_name || profile?.full_name || profile?.username)
    case 'bio':
      return hasText(profile?.bio)
    case 'avatar':
    case 'avatar_url':
      return hasText(profile?.avatar_url)
    case 'city':
      return hasText(profile?.city)
    case 'neighborhood':
      return hasText(profile?.neighborhood)
    case 'location':
      return (
        hasText(profile?.city || profile?.neighborhood) &&
        Number.isFinite(Number(profile?.lat)) &&
        Number.isFinite(Number(profile?.lng))
      )
    case 'phone':
    case 'phone_number':
      return hasText(profile?.phone_number)
    case 'stripe':
      return Boolean(profile?.stripe_onboarding_completed)
    case 'terms':
      return Boolean(profile?.terms_accepted && profile?.terms_version)
    default:
      return false
  }
}

export function isStepCompleted(profile, verificationState = {}, stripeState = {}, step) {
  switch (step) {
    case 'welcome':
      return true
    case 'basic-profile':
      return (
        isFieldCompleted(profile, 'full_name') &&
        isFieldCompleted(profile, 'bio')
      )
    case 'location':
      return isFieldCompleted(profile, 'location')
    case 'skills':
      return Array.isArray(verificationState?.skills) && verificationState.skills.length > 0
    case 'availability':
      return Array.isArray(verificationState?.availability) && verificationState.availability.length > 0
    case 'phone':
      return hasText(verificationState?.phoneContact?.phoneNumber || profile?.phone_number)
    case 'identity':
      return Boolean(stripeState?.stripe_onboarding_completed)
    case 'terms':
      return isFieldCompleted(profile, 'terms')
    default:
      return false
  }
}

export function getStepStatus(profile, verificationState = {}, stripeState = {}, step) {
  if (isStepCompleted(profile, verificationState, stripeState, step)) {
    return 'complete'
  }

  switch (step) {
    case 'basic-profile':
      if (hasText(profile?.display_name || profile?.full_name || profile?.username) || hasText(profile?.bio) || hasText(profile?.avatar_url)) {
        return 'review'
      }
      break
    case 'location':
      if (hasText(profile?.city) || hasText(profile?.neighborhood) || Number.isFinite(Number(profile?.lat)) || Number.isFinite(Number(profile?.lng))) {
        return 'review'
      }
      break
    case 'skills':
      if (Array.isArray(verificationState?.skills) && verificationState.skills.length > 0) {
        return 'review'
      }
      break
    case 'availability':
      if (Array.isArray(verificationState?.availability) && verificationState.availability.length > 0) {
        return 'review'
      }
      break
    case 'phone':
      if (hasText(verificationState?.phoneContact?.phoneNumber || profile?.phone_number)) {
        return 'review'
      }
      break
    case 'identity':
      if (stripeState?.stripe_onboarding_completed || stripeState?.stripe_charges_enabled || stripeState?.stripe_payouts_enabled) {
        return 'review'
      }
      break
    case 'terms':
      if (profile?.terms_accepted || profile?.terms_version) {
        return 'review'
      }
      break
    default:
      break
  }

  return 'pending'
}

export function buildHelperJourneyDraft(profile, verificationState = {}) {
  const fullName = profile?.display_name || profile?.full_name || ''
  const { firstName, lastName } = splitFullName(fullName)
  const phone = splitPhone(verificationState?.phoneContact?.phoneNumber || profile?.phone_number || '')
  const selectedSkillIds = Array.isArray(verificationState?.skills)
    ? verificationState.skills
        .map((row) => row?.skill_id || row?.skill?.id || row?.id)
        .filter(Boolean)
    : []
  const selectedDays = Array.isArray(verificationState?.availability)
    ? verificationState.availability
        .map((row) => Number(typeof row === 'object' && row !== null ? row.day_of_week : row))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : []

  return {
    mode: 'help',
    firstName,
    lastName,
    fullName,
    displayName: fullName,
    bio: profile?.bio || '',
    avatarUrl: profile?.avatar_url || '',
    city: profile?.city || '',
    country: profile?.country || '',
    neighborhood: profile?.neighborhood || '',
    lat: Number.isFinite(Number(profile?.lat)) ? profile.lat : null,
    lng: Number.isFinite(Number(profile?.lng)) ? profile.lng : null,
    activityPlace: profile?.city || profile?.neighborhood || '',
    helperEnabled: Boolean(profile?.helper_enabled),
    helperStatus: profile?.helper_status || 'not_started',
    availabilityEnabled: profile?.availability_enabled ?? true,
    selectedSkillIds,
    selectedDays,
    phonePrefix: phone.phonePrefix,
    phoneNumber: phone.phoneNumber,
    phoneStatus: verificationState?.phoneContact?.phoneStatus || (profile?.phone_number ? 'provided' : 'not_provided'),
    termsAccepted: Boolean(profile?.terms_accepted),
    termsAcceptedAt: profile?.terms_accepted_at || null,
    termsVersion: profile?.terms_version || null,
    verifiedEmail: Boolean(verificationState?.profileVerifications?.email_verified || profile?.verified_email),
    verifiedPhone: Boolean(verificationState?.profileVerifications?.phone_verified || profile?.verified_phone),
    verifiedIdentity: Boolean(verificationState?.profileVerifications?.identity_verified || profile?.verified_identity),
    identityVerified: Boolean(verificationState?.profileVerifications?.identity_verified || profile?.identity_verified),
  }
}

export function mergeHelperJourneyDraft(currentDraft = {}, fallbackDraft = {}) {
  const nextDraft = { ...currentDraft }

  for (const [key, value] of Object.entries(fallbackDraft)) {
    const currentValue = nextDraft[key]

    if (Array.isArray(value)) {
      if (!Array.isArray(currentValue) || currentValue.length === 0) {
        nextDraft[key] = value.slice()
      }
      continue
    }

    if (currentValue === undefined || currentValue === null || currentValue === '') {
      nextDraft[key] = value
      continue
    }

    if (currentValue === false && value === true) {
      if (
        key === 'termsAccepted' ||
        key === 'helperEnabled' ||
        key === 'availabilityEnabled' ||
        key === 'verifiedEmail' ||
        key === 'verifiedPhone' ||
        key === 'verifiedIdentity' ||
        key === 'identityVerified'
      ) {
        nextDraft[key] = value
      }
      continue
    }

    if (
      typeof currentValue === 'string' &&
      typeof value === 'string' &&
      ['phoneStatus', 'helperStatus'].includes(key) &&
      (currentValue === 'not_started' || currentValue === 'not_provided' || currentValue === 'pending') &&
      value !== currentValue
    ) {
      nextDraft[key] = value
    }
  }

  return nextDraft
}
