alter table public.tasks
  add column if not exists published_at timestamptz;

alter table public.tasks
  alter column status set default 'draft';

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled'));

create index if not exists tasks_published_at_idx
on public.tasks(published_at desc);

drop policy if exists "Authenticated users can view open and related tasks" on public.tasks;
create policy "Authenticated users can view open and related tasks"
on public.tasks for select
to authenticated
using (
  (status = 'draft' and requester_id = (select auth.uid()))
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

drop policy if exists "Requester can delete own tasks" on public.tasks;
create policy "Requester can delete own tasks"
on public.tasks for delete
to authenticated
using (
  requester_id = (select auth.uid())
  and status in ('draft', 'open', 'assigned', 'in_progress')
);
