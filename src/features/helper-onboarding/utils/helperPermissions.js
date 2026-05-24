// Capa de permisos para onboarding progresivo de helpers.
// Fuente de verdad de verificacion: `profile_verifications`.
// Compatibilidad temporal: los campos legacy de `profiles.*verified*` siguen funcionando
// mientras migramos pantallas y servicios de forma incremental.

export const HELPER_STATUS = Object.freeze({
  NOT_STARTED: 'not_started',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  CONTACT_PENDING: 'contact_pending',
  IDENTITY_PENDING: 'identity_pending',
  TERMS_PENDING: 'terms_pending',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
})

export const HELPER_TERMS_VERSION = 'helpme-helper-terms-v1'

const ACTIVE_ACCOUNT_STATUS = 'active'
const ACTIVE_HELPER_STATUS = HELPER_STATUS.ACTIVE
const BLOCKED_HELPER_STATUSES = new Set([
  HELPER_STATUS.NOT_STARTED,
  HELPER_STATUS.PROFILE_INCOMPLETE,
  HELPER_STATUS.CONTACT_PENDING,
  HELPER_STATUS.IDENTITY_PENDING,
  HELPER_STATUS.TERMS_PENDING,
  HELPER_STATUS.REJECTED,
  HELPER_STATUS.SUSPENDED,
])

function toBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function hasLocation(profile) {
  return Number.isFinite(Number(profile?.lat)) && Number.isFinite(Number(profile?.lng))
}

function hasRequesterBasics(profile) {
  return Boolean(profile?.display_name || profile?.full_name || profile?.username)
}

function hasHelperIntent(profile) {
  return profile?.helper_status === ACTIVE_HELPER_STATUS || profile?.helper_enabled === true
}

function getVerificationSnapshot(profile) {
  const current = profile?.profile_verifications || profile?.verifications || null

  if (current) {
    return {
      email: toBoolean(current.email_verified),
      phone: toBoolean(current.phone_verified),
      identity: toBoolean(current.identity_verified),
      background: toBoolean(current.background_checked),
      source: 'profile_verifications',
    }
  }

  return {
    email: toBoolean(profile?.verified_email),
    phone: toBoolean(profile?.verified_phone),
    identity: toBoolean(profile?.verified_identity) || toBoolean(profile?.identity_verified),
    background: false,
    source: 'legacy',
  }
}

function hasHelperTrust(profile) {
  const verification = getVerificationSnapshot(profile)
  return verification.email || verification.identity || toBoolean(profile?.verified)
}

function hasHelperSkills(profile, draft = {}) {
  if (Array.isArray(draft?.selectedSkillIds)) {
    return draft.selectedSkillIds.length > 0
  }

  if (Array.isArray(profile?.skills)) {
    return profile.skills.length > 0
  }

  return Boolean(profile?.skills_count || profile?.completed_tasks)
}

function hasHelperAvailability(profile, draft = {}) {
  if (Array.isArray(draft?.selectedDays)) {
    return draft.selectedDays.length > 0
  }

  return Boolean(profile?.availability_enabled !== false)
}

function hasAcceptedTerms(profile, draft = {}) {
  return Boolean(draft?.termsAccepted || profile?.terms_accepted)
}

function hasAcceptedTermsVersion(profile, draft = {}) {
  return Boolean(draft?.termsVersion || profile?.terms_version)
}

export function canStartHelperOnboarding(profile) {
  return Boolean(profile && profile.account_status === ACTIVE_ACCOUNT_STATUS && hasRequesterBasics(profile))
}

export function canCreateTask(profile) {
  return Boolean(profile && profile.account_status === ACTIVE_ACCOUNT_STATUS && hasRequesterBasics(profile))
}

export function needsRequesterProfile(profile) {
  return !canCreateTask(profile)
}

export function canOfferHelp(profile) {
  if (!profile) return false
  if (profile.account_status !== ACTIVE_ACCOUNT_STATUS) return false
  // helper_enabled se mantiene como fallback legacy mientras migra el onboarding.
  if (!hasHelperIntent(profile)) return false

  return true
}

export function canAppearOnMap(profile) {
  if (!profile) return false
  if (profile.helper_status !== ACTIVE_HELPER_STATUS) return false
  if (profile.account_status !== ACTIVE_ACCOUNT_STATUS) return false
  if (profile.availability_enabled === false) return false
  if (!hasLocation(profile)) return false
  if (!hasHelperTrust(profile)) return false

  return true
}

export function canAcceptTask(profile) {
  return canAppearOnMap(profile)
}

export function needsHelperProfile(profile) {
  return profile?.helper_status !== ACTIVE_HELPER_STATUS
}

export function canActivateHelper(profile, draft = {}) {
  if (!profile) return false
  if (profile.account_status !== ACTIVE_ACCOUNT_STATUS) return false
  if (!hasRequesterBasics(profile)) return false
  if (!hasLocation(profile)) return false
  if (!hasHelperSkills(profile, draft)) return false
  if (!hasHelperAvailability(profile, draft)) return false
  if (!toBoolean(profile?.stripe_onboarding_completed)) return false
  if (!hasAcceptedTerms(profile, draft)) return false
  if (!hasAcceptedTermsVersion(profile, draft)) return false

  return true
}

export function isHelperBlocked(profile) {
  return Boolean(profile && BLOCKED_HELPER_STATUSES.has(profile.helper_status))
}
