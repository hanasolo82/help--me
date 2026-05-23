-- Helper phone contact: optional contact number for onboarding.
-- This is not phone verification. OTP / SMS / verified states are reserved for future flows.

alter table public.profiles
  add column if not exists phone_number text;

alter table public.profile_verifications
  add column if not exists phone_status text not null default 'not_provided'
    check (phone_status in ('not_provided', 'provided', 'verified'));

-- Existing RLS policies on profile_verifications already cover authenticated self-management.
-- No new service role paths are introduced here.

