-- Professional helper offer workflow:
-- Helpers apply to open tasks, requesters select one application, and the
-- existing tasks.accepted_by/status='assigned' contract remains the payment gate.

create extension if not exists pgcrypto;

create table if not exists public.task_applications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  message text check (message is null or char_length(message) <= 600),
  status text not null default 'pending'
    check (status in ('pending', 'selected', 'rejected', 'withdrawn', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (helper_id is not null)
);

create index if not exists task_applications_task_id_created_at_idx
  on public.task_applications(task_id, created_at);

create index if not exists task_applications_helper_id_idx
  on public.task_applications(helper_id);

create index if not exists task_applications_status_idx
  on public.task_applications(status);

create unique index if not exists task_applications_one_active_per_helper_task_idx
  on public.task_applications(task_id, helper_id)
  where status in ('pending', 'selected');

alter table public.task_applications enable row level security;

drop policy if exists "Task applicants and owners can read applications" on public.task_applications;
create policy "Task applicants and owners can read applications"
  on public.task_applications
  for select
  to authenticated
  using (
    helper_id = (select auth.uid())
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.created_by = (select auth.uid())
    )
  );

drop policy if exists "Helpers can insert own pending applications" on public.task_applications;
create policy "Helpers can insert own pending applications"
  on public.task_applications
  for insert
  to authenticated
  with check (
    helper_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.tasks t
      join public.profiles p on p.id = (select auth.uid())
      where t.id = task_id
        and t.status = 'open'
        and t.accepted_by is null
        and t.created_by <> (select auth.uid())
        and p.account_status = 'active'
        and coalesce(p.helper_status, 'inactive') = 'active'
    )
  );

drop policy if exists "Application participants can update constrained state" on public.task_applications;
create policy "Application participants can update constrained state"
  on public.task_applications
  for update
  to authenticated
  using (
    helper_id = (select auth.uid())
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.created_by = (select auth.uid())
    )
  )
  with check (
    helper_id = (select auth.uid())
    or exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.created_by = (select auth.uid())
    )
  );

create or replace function public.apply_to_task(
  p_task_id uuid,
  p_message text default null
)
returns public.task_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
  task_row public.tasks%rowtype;
  helper_profile record;
  application_row public.task_applications%rowtype;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if p_task_id is null then
    raise exception 'Task id is required';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.created_by = me then
    raise exception 'You cannot apply to your own task';
  end if;

  if task_row.status <> 'open' or task_row.accepted_by is not null then
    raise exception 'This task is not open for applications';
  end if;

  select p.id, p.account_status, p.helper_status
  into helper_profile
  from public.profiles p
  where p.id = me;

  if helper_profile.id is null
    or helper_profile.account_status <> 'active'
    or coalesce(helper_profile.helper_status, 'inactive') <> 'active' then
    raise exception 'Only active helpers can apply to tasks';
  end if;

  if clean_message is not null and char_length(clean_message) > 600 then
    raise exception 'Application message exceeds the maximum length';
  end if;

  insert into public.task_applications (task_id, helper_id, message, status)
  values (p_task_id, me, clean_message, 'pending')
  on conflict (task_id, helper_id)
    where status in ('pending', 'selected')
  do update
    set message = coalesce(excluded.message, public.task_applications.message),
        updated_at = now()
  returning * into application_row;

  return application_row;
end;
$$;

grant execute on function public.apply_to_task(uuid, text) to authenticated;

create or replace function public.select_task_helper(p_application_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  application_row public.task_applications%rowtype;
  task_row public.tasks%rowtype;
  updated_task public.tasks%rowtype;
  now_value timestamptz := now();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  select *
  into application_row
  from public.task_applications
  where id = p_application_id
  for update;

  if application_row.id is null then
    raise exception 'Application not found';
  end if;

  select *
  into task_row
  from public.tasks
  where id = application_row.task_id
  for update;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.created_by <> me then
    raise exception 'Only the requester can select a helper';
  end if;

  if task_row.status <> 'open' or task_row.accepted_by is not null then
    raise exception 'This task is not open for selecting a helper';
  end if;

  if application_row.status <> 'pending' then
    raise exception 'This application is not pending';
  end if;

  update public.task_applications
  set status = 'selected',
      updated_at = now_value
  where id = application_row.id;

  update public.tasks
  set accepted_by = application_row.helper_id,
      status = 'assigned',
      modified_at = now_value,
      updated_at = now_value
  where id = task_row.id
    and created_by = me
    and status = 'open'
    and accepted_by is null
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'The helper could not be selected safely';
  end if;

  return updated_task;
end;
$$;

grant execute on function public.select_task_helper(uuid) to authenticated;

create or replace function public.reject_task_application(p_application_id uuid)
returns public.task_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  application_row public.task_applications%rowtype;
  updated_application public.task_applications%rowtype;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  select a.*
  into application_row
  from public.task_applications a
  join public.tasks t on t.id = a.task_id
  where a.id = p_application_id
    and t.created_by = me
  for update;

  if application_row.id is null then
    raise exception 'Application not found';
  end if;

  if application_row.status <> 'pending' then
    raise exception 'Only pending applications can be rejected here';
  end if;

  update public.task_applications
  set status = 'rejected',
      updated_at = now()
  where id = application_row.id
  returning * into updated_application;

  return updated_application;
end;
$$;

grant execute on function public.reject_task_application(uuid) to authenticated;

create or replace function public.withdraw_task_application(p_application_id uuid)
returns public.task_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  application_row public.task_applications%rowtype;
  updated_application public.task_applications%rowtype;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  select *
  into application_row
  from public.task_applications
  where id = p_application_id
    and helper_id = me
  for update;

  if application_row.id is null then
    raise exception 'Application not found';
  end if;

  if application_row.status <> 'pending' then
    raise exception 'Only pending applications can be withdrawn';
  end if;

  update public.task_applications
  set status = 'withdrawn',
      updated_at = now()
  where id = application_row.id
  returning * into updated_application;

  return updated_application;
end;
$$;

grant execute on function public.withdraw_task_application(uuid) to authenticated;

create or replace function public.reject_assigned_helper(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  task_row public.tasks%rowtype;
  updated_task public.tasks%rowtype;
  now_value timestamptz := now();
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if p_task_id is null then
    raise exception 'Task id is required';
  end if;

  select *
  into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.created_by <> me then
    raise exception 'Only the requester can reject this helper';
  end if;

  if task_row.status <> 'assigned' or task_row.accepted_by is null then
    raise exception 'This task is not waiting for requester confirmation';
  end if;

  if exists (
    select 1
    from public.payments p
    where p.task_id = p_task_id
      and p.status in (
        'captured',
        'held',
        'release_pending',
        'transferring',
        'released',
        'refunding',
        'refunded',
        'succeeded',
        'external_agreed',
        'processing'
      )
  ) then
    raise exception 'This task already has a confirmed payment';
  end if;

  update public.payments p
  set status = 'voided',
      metadata = coalesce(p.metadata, '{}'::jsonb) || jsonb_build_object(
        'voided_reason', 'helper_rejected_by_requester',
        'voided_by', me,
        'voided_at', now_value
      ),
      updated_at = now_value
  where p.task_id = p_task_id
    and p.status in (
      'draft',
      'requires_checkout',
      'pending',
      'requires_action',
      'failed',
      'voided'
    );

  update public.task_applications
  set status = 'rejected',
      updated_at = now_value
  where task_id = p_task_id
    and helper_id = task_row.accepted_by
    and status = 'selected';

  delete from public.conversations c
  where c.task_id = p_task_id
    and c.conversation_type = 'task';

  update public.tasks
  set accepted_by = null,
      status = 'open',
      modified_at = now_value,
      updated_at = now_value,
      published_at = coalesce(published_at, now_value)
  where id = p_task_id
    and created_by = me
    and accepted_by = task_row.accepted_by
    and status = 'assigned'
  returning * into updated_task;

  if updated_task.id is null then
    raise exception 'The helper could not be rejected safely';
  end if;

  return updated_task;
end;
$$;

grant execute on function public.reject_assigned_helper(uuid) to authenticated;

drop policy if exists "Helper can accept open tasks" on public.tasks;
drop policy if exists "Helper can progress accepted tasks" on public.tasks;
drop policy if exists "Requester can update own tasks" on public.tasks;

create policy "Requester can update own draft or open tasks"
  on public.tasks
  for update
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

create policy "Requester can cancel own unresolved tasks"
  on public.tasks
  for update
  to authenticated
  using (
    created_by = (select auth.uid())
    and status in ('draft', 'open', 'assigned', 'in_progress')
  )
  with check (
    created_by = (select auth.uid())
    and status = 'cancelled'
  );

create policy "Requester can complete own in-progress tasks"
  on public.tasks
  for update
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

notify pgrst, 'reload schema';
