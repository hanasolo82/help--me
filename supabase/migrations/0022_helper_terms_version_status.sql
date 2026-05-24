alter table public.profiles
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists helper_status text not null default 'not_started';

alter table public.profiles
  drop constraint if exists profiles_helper_status_check;

alter table public.profiles
  add constraint profiles_helper_status_check
  check (
    helper_status in (
      'not_started',
      'profile_incomplete',
      'contact_pending',
      'identity_pending',
      'terms_pending',
      'under_review',
      'active',
      'rejected',
      'suspended'
    )
  );
