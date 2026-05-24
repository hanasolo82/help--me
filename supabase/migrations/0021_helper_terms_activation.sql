alter table public.profiles
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_accepted_at timestamptz;
