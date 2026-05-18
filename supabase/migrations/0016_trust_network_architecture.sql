-- Phase trust network: profiles, skills, reviews, verifications, availability, helpers map, payments-ready.
-- Safe additive migration: no rompe tasks, chats ni auth actual.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists response_time_minutes integer,
  add column if not exists reviews_count integer not null default 0,
  add column if not exists verified_email boolean not null default false,
  add column if not exists verified_phone boolean not null default false,
  add column if not exists verified_identity boolean not null default false,
  add column if not exists helper_enabled boolean not null default false,
  add column if not exists hourly_rate numeric(6,2),
  add column if not exists availability_enabled boolean not null default true,
  add column if not exists stripe_onboarding_completed boolean not null default false,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false;

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 50),
  icon text,
  category text not null check (char_length(category) between 2 and 50),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_skills (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  experience_level text not null default 'beginner'
    check (experience_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  years_experience numeric(4,1) not null default 0 check (years_experience >= 0 and years_experience <= 99.9),
  created_at timestamptz not null default now(),
  primary key (profile_id, skill_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  communication_rating integer not null check (communication_rating between 1 and 5),
  punctuality_rating integer not null check (punctuality_rating between 1 and 5),
  trust_rating integer not null check (trust_rating between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 600),
  created_at timestamptz not null default now(),
  unique (task_id, reviewer_id, reviewed_user_id),
  check (reviewer_id <> reviewed_user_id)
);

create table if not exists public.profile_verifications (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  payment_verified boolean not null default false,
  identity_verified boolean not null default false,
  background_checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_availability (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, day_of_week, start_time),
  check (end_time > start_time)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  payer_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(8,2) not null check (amount >= 0 and amount <= 999999.99),
  platform_fee numeric(8,2) not null default 0 check (platform_fee >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'requires_action', 'processing', 'succeeded', 'failed', 'refunded')),
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_favorites (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  favorited_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, favorited_profile_id)
);

create index if not exists skills_category_idx on public.skills(category);
create index if not exists profile_skills_skill_id_idx on public.profile_skills(skill_id);
create index if not exists reviews_reviewed_user_id_idx on public.reviews(reviewed_user_id);
create index if not exists reviews_task_id_idx on public.reviews(task_id);
create index if not exists reviews_reviewer_id_idx on public.reviews(reviewer_id);
create index if not exists profile_verifications_profile_id_idx on public.profile_verifications(profile_id);
create index if not exists profile_availability_profile_id_day_idx on public.profile_availability(profile_id, day_of_week);
create index if not exists payments_task_id_idx on public.payments(task_id);
create index if not exists payments_payer_id_idx on public.payments(payer_id);
create index if not exists payments_receiver_id_idx on public.payments(receiver_id);
create index if not exists profile_favorites_favorited_profile_id_idx on public.profile_favorites(favorited_profile_id);

alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.reviews enable row level security;
alter table public.profile_verifications enable row level security;
alter table public.profile_availability enable row level security;
alter table public.payments enable row level security;
alter table public.profile_favorites enable row level security;

drop policy if exists "Skills readable by authenticated users" on public.skills;
create policy "Skills readable by authenticated users"
on public.skills for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Profile skills readable by authenticated users" on public.profile_skills;
create policy "Profile skills readable by authenticated users"
on public.profile_skills for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Users can manage their own profile skills" on public.profile_skills;
create policy "Users can manage their own profile skills"
on public.profile_skills for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "Reviews readable by authenticated users" on public.reviews;
create policy "Reviews readable by authenticated users"
on public.reviews for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Users can leave reviews after completed tasks" on public.reviews;
create policy "Users can leave reviews after completed tasks"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and reviewer_id <> reviewed_user_id
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.status = 'completed'
      and (
        (t.created_by = reviewer_id and t.accepted_by = reviewed_user_id)
        or (t.accepted_by = reviewer_id and t.created_by = reviewed_user_id)
      )
  )
);

drop policy if exists "Profile verifications readable by authenticated users" on public.profile_verifications;
create policy "Profile verifications readable by authenticated users"
on public.profile_verifications for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Users can manage their own verification row" on public.profile_verifications;
create policy "Users can manage their own verification row"
on public.profile_verifications for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "Availability readable by authenticated users" on public.profile_availability;
create policy "Availability readable by authenticated users"
on public.profile_availability for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Users can manage their own availability" on public.profile_availability;
create policy "Users can manage their own availability"
on public.profile_availability for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "Payments readable by participants" on public.payments;
create policy "Payments readable by participants"
on public.payments for select
to authenticated
using (
  payer_id = (select auth.uid())
  or receiver_id = (select auth.uid())
);

drop policy if exists "Payments insertable by payer" on public.payments;
create policy "Payments insertable by payer"
on public.payments for insert
to authenticated
with check (payer_id = (select auth.uid()));

drop policy if exists "Payment statuses manageable by participants" on public.payments;
create policy "Payment statuses manageable by participants"
on public.payments for update
to authenticated
using (
  payer_id = (select auth.uid())
  or receiver_id = (select auth.uid())
)
with check (
  payer_id = (select auth.uid())
  or receiver_id = (select auth.uid())
);

drop policy if exists "Favorites readable by viewer" on public.profile_favorites;
create policy "Favorites readable by viewer"
on public.profile_favorites for select
to authenticated
using (viewer_id = (select auth.uid()));

drop policy if exists "Users can manage their own favorites" on public.profile_favorites;
create policy "Users can manage their own favorites"
on public.profile_favorites for all
to authenticated
using (viewer_id = (select auth.uid()))
with check (viewer_id = (select auth.uid()));

create or replace function public.recompute_profile_reviews_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile_id uuid;
begin
  target_profile_id := coalesce(new.reviewed_user_id, old.reviewed_user_id);

  update public.profiles
  set reviews_count = (
        select count(*)
        from public.reviews
        where reviewed_user_id = target_profile_id
      ),
      updated_at = now()
  where id = target_profile_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_after_write on public.reviews;
create trigger reviews_after_write
after insert or update or delete on public.reviews
for each row execute function public.recompute_profile_reviews_count();

create or replace function public.ensure_profile_trust_rows()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profile_verifications (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_after_insert_trust_rows on public.profiles;
create trigger profiles_after_insert_trust_rows
after insert on public.profiles
for each row execute function public.ensure_profile_trust_rows();

insert into public.profile_verifications (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;

insert into public.skills (name, icon, category)
values
  ('Paseo de perros', '🐶', 'Mascotas'),
  ('Cuidado de gatos', '🐱', 'Mascotas'),
  ('Montaje de muebles', '🛠️', 'Hogar'),
  ('Limpieza ligera', '🧽', 'Hogar'),
  ('Recados rápidos', '🏃', 'Recados'),
  ('Compras a domicilio', '🛒', 'Recados'),
  ('Ayuda con móvil', '📱', 'Tecnología'),
  ('Ayuda con ordenador', '💻', 'Tecnología'),
  ('Clases de apoyo', '📚', 'Educación'),
  ('Cuidado infantil', '🧸', 'Cuidado')
on conflict (name) do nothing;
