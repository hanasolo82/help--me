-- Follow-up hardening for tasks:
-- The remote database already had migration 0026 recorded, so we reconcile the
-- task update policies here without rewriting applied history.

drop policy if exists "Requester or helper can update related tasks" on public.tasks;
drop policy if exists "Requester can update own tasks" on public.tasks;
drop policy if exists "Helper can accept open tasks" on public.tasks;
drop policy if exists "Helper can progress accepted tasks" on public.tasks;

create policy "Requester can update own tasks"
  on public.tasks
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Helper can accept open tasks"
  on public.tasks
  for update
  to authenticated
  using (
    status = 'open'
    and accepted_by is null
    and created_by <> auth.uid()
  )
  with check (
    status = 'assigned'
    and accepted_by = auth.uid()
    and created_by <> auth.uid()
  );

create policy "Helper can progress accepted tasks"
  on public.tasks
  for update
  to authenticated
  using (
    accepted_by = auth.uid()
    and status in ('assigned', 'in_progress')
  )
  with check (
    accepted_by = auth.uid()
    and created_by <> auth.uid()
    and status in ('assigned', 'in_progress')
  );
