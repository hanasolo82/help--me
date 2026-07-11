-- Every newly published task has a bounded execution window. Existing tasks stay
-- compatible: the fields are nullable and only a publish/window change is guarded.

alter table public.tasks
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists timezone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_time_window_order_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_time_window_order_check
      check (
        (starts_at is null and ends_at is null)
        or (starts_at is not null and ends_at is not null and ends_at > starts_at)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_time_window_minimum_duration_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_time_window_minimum_duration_check
      check (
        starts_at is null
        or ends_at - starts_at >= interval '30 minutes'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_timezone_length_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_timezone_length_check
      check (timezone is null or char_length(timezone) <= 64);
  end if;
end;
$$;

create index if not exists tasks_open_ends_at_idx
  on public.tasks (ends_at)
  where status = 'open' and ends_at is not null;

create or replace function public.enforce_task_time_window()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  needs_validation boolean := false;
begin
  if new.status <> 'open' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    needs_validation := true;
  else
    needs_validation := old.status is distinct from new.status
      or old.starts_at is distinct from new.starts_at
      or old.ends_at is distinct from new.ends_at;
  end if;

  if not needs_validation then
    return new;
  end if;

  if new.starts_at is null or new.ends_at is null then
    raise exception 'Published tasks require a start and end time';
  end if;

  if new.starts_at < now() + interval '30 minutes' then
    raise exception 'Task start must be at least 30 minutes in the future';
  end if;

  if new.ends_at <= new.starts_at then
    raise exception 'Task end must be after its start';
  end if;

  if new.ends_at - new.starts_at < interval '30 minutes' then
    raise exception 'Task duration must be at least 30 minutes';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_enforce_time_window on public.tasks;
create trigger tasks_enforce_time_window
before insert or update of status, starts_at, ends_at on public.tasks
for each row execute function public.enforce_task_time_window();

create or replace function public.apply_to_task(
  p_task_id uuid,
  p_message text default null,
  p_availability_response text default null,
  p_proposed_date date default null,
  p_proposed_time_slot text default null,
  p_proposed_time_note text default null
)
returns public.task_applications
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
  clean_availability_response text := nullif(trim(coalesce(p_availability_response, '')), '');
  clean_proposed_time_slot text := nullif(trim(coalesce(p_proposed_time_slot, '')), '');
  clean_proposed_time_note text := nullif(trim(coalesce(p_proposed_time_note, '')), '');
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

  if task_row.ends_at is not null and task_row.ends_at <= now() then
    raise exception 'This task time window has ended';
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

  if clean_availability_response is not null
    and clean_availability_response not in ('matches', 'alternative') then
    raise exception 'Invalid availability response';
  end if;

  if clean_proposed_time_slot is not null
    and clean_proposed_time_slot not in ('morning', 'midday', 'afternoon', 'evening', 'flexible') then
    raise exception 'Invalid proposed time slot';
  end if;

  if clean_proposed_time_note is not null and char_length(clean_proposed_time_note) > 240 then
    raise exception 'Proposed time note exceeds the maximum length';
  end if;

  insert into public.task_applications (
    task_id,
    helper_id,
    message,
    status,
    availability_response,
    proposed_date,
    proposed_time_slot,
    proposed_time_note
  )
  values (
    p_task_id,
    me,
    clean_message,
    'pending',
    clean_availability_response,
    p_proposed_date,
    clean_proposed_time_slot,
    clean_proposed_time_note
  )
  on conflict (task_id, helper_id)
    where status in ('pending', 'selected')
  do nothing
  returning * into application_row;

  if application_row.id is null then
    raise exception 'You have already applied to this task';
  end if;

  return application_row;
end;
$$;

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

  if task_row.ends_at is not null and task_row.ends_at <= now_value then
    raise exception 'This task time window has ended';
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
      requested_date = case
        when application_row.availability_response = 'alternative'
          then coalesce(application_row.proposed_date, public.tasks.requested_date)
        else public.tasks.requested_date
      end,
      requested_time_slot = case
        when application_row.availability_response = 'alternative'
          then coalesce(application_row.proposed_time_slot, public.tasks.requested_time_slot)
        else public.tasks.requested_time_slot
      end,
      requested_time_note = case
        when application_row.availability_response = 'alternative'
          then coalesce(application_row.proposed_time_note, public.tasks.requested_time_note)
        else public.tasks.requested_time_note
      end,
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

revoke execute on function public.apply_to_task(uuid, text, text, date, text, text) from public;
revoke execute on function public.apply_to_task(uuid, text, text, date, text, text) from anon;
grant execute on function public.apply_to_task(uuid, text, text, date, text, text) to authenticated;
grant execute on function public.select_task_helper(uuid) to authenticated;

notify pgrst, 'reload schema';
