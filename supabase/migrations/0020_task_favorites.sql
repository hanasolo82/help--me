create table if not exists public.task_favorites (
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (viewer_id, task_id)
);

create index if not exists task_favorites_task_id_idx on public.task_favorites(task_id);

alter table public.task_favorites enable row level security;

drop policy if exists "Task favorites readable by viewer" on public.task_favorites;
create policy "Task favorites readable by viewer"
on public.task_favorites for select
to authenticated
using (viewer_id = (select auth.uid()));

drop policy if exists "Users can manage their own task favorites" on public.task_favorites;
create policy "Users can manage their own task favorites"
on public.task_favorites for all
to authenticated
using (
  viewer_id = (select auth.uid())
)
with check (
  viewer_id = (select auth.uid())
  and exists (
    select 1
    from public.tasks t
    where t.id = task_id
      and t.status = 'open'
      and t.created_by <> viewer_id
  )
);
