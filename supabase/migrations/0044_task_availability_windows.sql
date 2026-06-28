-- Lightweight availability metadata for tasks and applications.
-- Nullable by design so existing tasks and direct application flows remain compatible.

alter table public.tasks
  add column if not exists requested_date date,
  add column if not exists requested_time_slot text,
  add column if not exists requested_time_note text;

alter table public.task_applications
  add column if not exists availability_response text,
  add column if not exists proposed_date date,
  add column if not exists proposed_time_slot text,
  add column if not exists proposed_time_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_requested_time_slot_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_requested_time_slot_check
      check (
        requested_time_slot is null
        or requested_time_slot in ('morning', 'midday', 'afternoon', 'evening', 'flexible')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tasks_requested_time_note_length_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_requested_time_note_length_check
      check (requested_time_note is null or char_length(requested_time_note) <= 240);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_applications_availability_response_check'
      and conrelid = 'public.task_applications'::regclass
  ) then
    alter table public.task_applications
      add constraint task_applications_availability_response_check
      check (
        availability_response is null
        or availability_response in ('matches', 'alternative')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_applications_proposed_time_slot_check'
      and conrelid = 'public.task_applications'::regclass
  ) then
    alter table public.task_applications
      add constraint task_applications_proposed_time_slot_check
      check (
        proposed_time_slot is null
        or proposed_time_slot in ('morning', 'midday', 'afternoon', 'evening', 'flexible')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'task_applications_proposed_time_note_length_check'
      and conrelid = 'public.task_applications'::regclass
  ) then
    alter table public.task_applications
      add constraint task_applications_proposed_time_note_length_check
      check (proposed_time_note is null or char_length(proposed_time_note) <= 240);
  end if;
end;
$$;

drop function if exists public.apply_to_task(uuid, text);

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

grant execute on function public.apply_to_task(uuid, text, text, date, text, text) to authenticated;

notify pgrst, 'reload schema';
