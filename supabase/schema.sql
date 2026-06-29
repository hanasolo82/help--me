-- helpMe schema (fuente unica autoritativa)
-- Refleja el estado real de la DB de produccion contra la que corre el frontend.
-- Ejecutar en SQL editor de Supabase. NUNCA usar service_role en el cliente.

create extension if not exists pgcrypto;

-- profiles: datos publicos del usuario; FK a auth.users para borrado en cascada.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 80),
  avatar_url text,
  neighborhood text not null check (char_length(neighborhood) between 2 and 80),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  verified boolean not null default false,
  account_status text not null default 'active'
    check (account_status in ('active', 'unavailable', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- tasks: created_by/accepted_by apuntan a auth.users (no a profiles).
-- El profile del creador se carga aparte desde el cliente porque no hay FK directa
-- a profiles.id (ver tasksService.attachCreatorProfiles).
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 3 and 600),
  category text not null check (category in ('Mascotas', 'Recados', 'Compras', 'Ayuda tecnica', 'Limpieza', 'Mudanza', 'Reparaciones', 'Clases', 'Cuidado', 'Tecnología', 'Otros')),
  price numeric(6,2) not null check (price >= 0 and price <= 500),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location_label text check (location_label is null or char_length(location_label) <= 240),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  cancelled_at timestamptz,
  modified_at timestamptz,
  completed_at timestamptz,
  check (accepted_by is null or accepted_by <> created_by)
);

-- chats: una fila por pareja (task, requester, helper). unique(task_id) garantiza
-- que cada tarea aceptada tiene un solo chat.
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user1_id uuid not null references auth.users(id) on delete cascade,
  user2_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id),
  check (user1_id <> user2_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.messages replica identity full;

-- Ratings (pendiente de UI; trigger recalcula rating/completed_tasks del helper).
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  rater_id uuid not null references auth.users(id) on delete cascade,
  rated_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 600),
  created_at timestamptz not null default now(),
  unique (task_id, rater_id),
  check (rater_id <> rated_id)
);

create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists profiles_account_status_idx on public.profiles(account_status);
create index if not exists tasks_created_by_idx on public.tasks(created_by);
create index if not exists tasks_accepted_by_idx on public.tasks(accepted_by);
create index if not exists tasks_status_category_idx on public.tasks(status, category);
create index if not exists tasks_published_at_idx on public.tasks(published_at desc);
create index if not exists tasks_cancelled_at_idx on public.tasks(cancelled_at desc);
create index if not exists tasks_modified_at_idx on public.tasks(modified_at desc);
create index if not exists chats_task_id_idx on public.chats(task_id);
create index if not exists chats_participants_idx on public.chats(user1_id, user2_id);
create index if not exists messages_chat_id_created_at_idx on public.messages(chat_id, created_at);
create index if not exists ratings_rated_id_idx on public.ratings(rated_id);
create index if not exists ratings_task_id_idx on public.ratings(task_id);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.ratings enable row level security;

-- profiles
drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- tasks
drop policy if exists "Authenticated users can view open and related tasks" on public.tasks;
create policy "Authenticated users can view open and related tasks"
on public.tasks for select
to authenticated
using (
  (status = 'draft' and created_by = (select auth.uid()))
  or status = 'open'
  or created_by = (select auth.uid())
  or accepted_by = (select auth.uid())
);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and accepted_by is null
  and status in ('draft', 'open')
);

drop policy if exists "Requester or helper can update related tasks" on public.tasks;
drop policy if exists "Requester can update own draft or open tasks" on public.tasks;
create policy "Requester can update own draft or open tasks"
on public.tasks for update
to authenticated
using (
  created_by = (select auth.uid())
  and status in ('draft', 'open')
  and accepted_by is null
)
with check (
  created_by = (select auth.uid())
  and status in ('draft', 'open', 'cancelled')
  and accepted_by is null
);

drop policy if exists "Requester can cancel own unresolved tasks" on public.tasks;
create policy "Requester can cancel own unresolved tasks"
on public.tasks for update
to authenticated
using (
  created_by = (select auth.uid())
  and status in ('draft', 'open', 'assigned', 'in_progress')
)
with check (
  created_by = (select auth.uid())
  and status = 'cancelled'
);

drop policy if exists "Requester can complete own in-progress tasks" on public.tasks;
create policy "Requester can complete own in-progress tasks"
on public.tasks for update
to authenticated
using (
  created_by = (select auth.uid())
  and accepted_by is not null
  and status in ('in_progress', 'completed')
)
with check (
  created_by = (select auth.uid())
  and accepted_by is not null
  and status = 'completed'
);

drop policy if exists "Requester can delete own tasks" on public.tasks;
create policy "Requester can delete own tasks"
on public.tasks for delete
to authenticated
using (
  created_by = (select auth.uid())
  and status in ('draft', 'open', 'assigned', 'in_progress')
);

-- chats
drop policy if exists "Participants can view chats" on public.chats;
create policy "Participants can view chats"
on public.chats for select
to authenticated
using (
  user1_id = (select auth.uid())
  or user2_id = (select auth.uid())
);

drop policy if exists "Participants can create chats" on public.chats;

-- messages
drop policy if exists "Participants can view messages" on public.messages;

drop policy if exists "Participants can send messages" on public.messages;

drop policy if exists "Participants can update own messages" on public.messages;

drop policy if exists "Participants can delete own messages" on public.messages;

-- ratings
drop policy if exists "Ratings readable by authenticated" on public.ratings;
create policy "Ratings readable by authenticated"
on public.ratings for select
to authenticated
using ((select auth.uid()) is not null);

drop policy if exists "Requester can rate completed task helper" on public.ratings;
create policy "Requester can rate completed task helper"
on public.ratings for insert
to authenticated
with check (
  rater_id = (select auth.uid())
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.created_by = rater_id
      and t.accepted_by = rated_id
      and t.status = 'completed'
  )
);

-- Recalcula rating promedio y completed_tasks del helper cuando entra una valoracion.
create or replace function public.recompute_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  avg_score numeric(2,1);
  done_count integer;
begin
  select coalesce(round(avg(score)::numeric, 1), 0)
  into avg_score
  from public.ratings
  where rated_id = new.rated_id;

  select count(*)
  into done_count
  from public.tasks
  where accepted_by = new.rated_id and status = 'completed';

  update public.profiles
  set rating = avg_score,
      completed_tasks = done_count,
      updated_at = now()
  where id = new.rated_id;

  return new;
end;
$$;

drop trigger if exists ratings_after_insert on public.ratings;
create trigger ratings_after_insert
after insert on public.ratings
for each row execute function public.recompute_profile_rating();

-- Storage: bucket publico para imagenes de tareas y avatares.
insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;

drop policy if exists "task-images public read" on storage.objects;
create policy "task-images public read"
on storage.objects for select
to public
using (bucket_id = 'task-images');

drop policy if exists "task-images owner upload" on storage.objects;
create policy "task-images owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'task-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "task-images owner delete" on storage.objects;
create policy "task-images owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'task-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars owner upload" on storage.objects;
create policy "avatars owner upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Falta historica: el avatar anterior queda huerfano si el usuario sube otro.
drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Realtime sobre messages para suscripciones del chat.
alter publication supabase_realtime add table public.messages;
