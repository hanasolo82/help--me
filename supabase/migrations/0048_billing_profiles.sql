-- Billing profiles: datos fiscales del usuario para los justificantes de
-- pago/cobro de /pagos. Una fila por usuario; el propio usuario la lee y la
-- escribe, nadie más (sin delete: el perfil se vacía, no se borra).

create table if not exists public.billing_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_name text not null default '',
  tax_id text not null default '',
  address_line text not null default '',
  postal_code text not null default '',
  city text not null default '',
  country text not null default 'ES',
  invoice_prefix text not null default 'HM',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.billing_profiles enable row level security;

drop policy if exists "Users can read own billing profile" on public.billing_profiles;
create policy "Users can read own billing profile"
  on public.billing_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert own billing profile" on public.billing_profiles;
create policy "Users can insert own billing profile"
  on public.billing_profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update own billing profile" on public.billing_profiles;
create policy "Users can update own billing profile"
  on public.billing_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.billing_profiles from anon;
grant select, insert, update on public.billing_profiles to authenticated;

create or replace function public.touch_billing_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists billing_profiles_touch_updated_at on public.billing_profiles;
create trigger billing_profiles_touch_updated_at
before update on public.billing_profiles
for each row execute function public.touch_billing_profiles_updated_at();

notify pgrst, 'reload schema';
