-- helpMe initial Supabase schema
-- Run this in Supabase SQL editor. Do not use service_role keys in the frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  full_name text not null check (char_length(full_name) between 2 and 80),
  avatar_url text,
  neighborhood text not null check (char_length(neighborhood) between 2 and 80),
  rating numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  completed_tasks integer not null default 0 check (completed_tasks >= 0),
  verified boolean not null default false,
  account_status text not null default 'active' check (account_status in ('active', 'unavailable', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  helper_id uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 3 and 600),
  category text not null check (category in ('Mascotas', 'Recados', 'Compras', 'Ayuda tecnica')),
  price_cents integer not null check (price_cents between 0 and 50000),
  urgency text not null check (urgency in ('Ahora', 'Hoy', 'Flexible')),
  status text not null default 'draft' check (status in ('draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  cancelled_at timestamptz,
  modified_at timestamptz,
  completed_at timestamptz,
  check (helper_id is null or helper_id <> requester_id)
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  helper_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (task_id),
  check (requester_id <> helper_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1200),
  created_at timestamptz not null default now()
);

create index if not exists profiles_created_at_idx on public.profiles(created_at desc);
create index if not exists profiles_username_idx on public.profiles(username);
create index if not exists tasks_requester_id_idx on public.tasks(requester_id);
create index if not exists tasks_helper_id_idx on public.tasks(helper_id);
create index if not exists tasks_status_category_idx on public.tasks(status, category);
create index if not exists tasks_published_at_idx on public.tasks(published_at desc);
create index if not exists tasks_cancelled_at_idx on public.tasks(cancelled_at desc);
create index if not exists tasks_modified_at_idx on public.tasks(modified_at desc);
create index if not exists chats_task_id_idx on public.chats(task_id);
create index if not exists chats_participants_idx on public.chats(requester_id, helper_id);
create index if not exists messages_chat_id_created_at_idx on public.messages(chat_id, created_at);

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Profiles are visible to authenticated users" on public.profiles;
create policy "Profiles are visible to authenticated users"
on public.profiles for select
to authenticated
using ((select auth.uid()) is not null);

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

drop policy if exists "Authenticated users can view open and related tasks" on public.tasks;
create policy "Authenticated users can view open and related tasks"
on public.tasks for select
to authenticated
using (
  status = 'draft' and requester_id = (select auth.uid())
  or status = 'open'
  or requester_id = (select auth.uid())
  or helper_id = (select auth.uid())
);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and helper_id is null
  and status in ('draft', 'open')
);

drop policy if exists "Requester or helper can update related tasks" on public.tasks;
create policy "Requester or helper can update related tasks"
on public.tasks for update
to authenticated
using (
  requester_id = (select auth.uid())
  or helper_id = (select auth.uid())
)
with check (
  requester_id = (select auth.uid())
  or helper_id = (select auth.uid())
);

drop policy if exists "Requester can delete own tasks" on public.tasks;
create policy "Requester can delete own tasks"
on public.tasks for delete
to authenticated
using (
  requester_id = (select auth.uid())
  and status in ('draft', 'open', 'assigned', 'in_progress')
);

drop policy if exists "Participants can view chats" on public.chats;
create policy "Participants can view chats"
on public.chats for select
to authenticated
using (
  requester_id = (select auth.uid())
  or helper_id = (select auth.uid())
);

drop policy if exists "Participants can create chats" on public.chats;
create policy "Participants can create chats"
on public.chats for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  or helper_id = (select auth.uid())
);

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.chats c
    where c.id = chat_id
    and (c.requester_id = (select auth.uid()) or c.helper_id = (select auth.uid()))
  )
);

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1
    from public.chats c
    where c.id = chat_id
    and (c.requester_id = (select auth.uid()) or c.helper_id = (select auth.uid()))
  )
);
