alter table public.profiles
add column if not exists stripe_account_id text;

alter table public.profiles
add column if not exists stripe_onboarding_completed boolean not null default false;

alter table public.profiles
add column if not exists stripe_charges_enabled boolean not null default false;

alter table public.profiles
add column if not exists stripe_payouts_enabled boolean not null default false;

alter table public.profiles
add column if not exists last_stripe_sync_at timestamptz;
