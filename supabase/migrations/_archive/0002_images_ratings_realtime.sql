-- helpMe migration 0002
-- Anade image_url a tasks, tabla ratings con trigger, bucket de imagenes y realtime para messages.
-- Ejecutar en SQL editor de Supabase despues de schema.sql.

alter table public.tasks
  add column if not exists image_url text check (image_url is null or char_length(image_url) <= 500);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  rated_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 5),
  comment text check (comment is null or char_length(comment) between 1 and 600),
  created_at timestamptz not null default now(),
  unique (task_id, rater_id),
  check (rater_id <> rated_id)
);

create index if not exists ratings_rated_id_idx on public.ratings(rated_id);
create index if not exists ratings_task_id_idx on public.ratings(task_id);

alter table public.ratings enable row level security;

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
      and t.requester_id = rater_id
      and t.helper_id = rated_id
      and t.status = 'completed'
  )
);

-- Recalcula rating promedio y contador de tareas completadas del helper cuando entra una valoracion.
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
  where helper_id = new.rated_id and status = 'completed';

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

-- Storage: bucket publico para imagenes de tareas. Ruta forzada {userId}/archivo via RLS.
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

-- Avatars bucket reutilizable para profiles.avatar_url.
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

-- Activa realtime sobre messages para suscripciones del chat.
alter publication supabase_realtime add table public.messages;
