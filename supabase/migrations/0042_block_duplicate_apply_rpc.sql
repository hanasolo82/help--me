-- Ensure apply_to_task is a strict state transition, not an idempotent message edit.
-- Active duplicate applications must be rejected by the server/RPC layer.

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
  do nothing
  returning * into application_row;

  if application_row.id is null then
    raise exception 'You have already applied to this task';
  end if;

  return application_row;
end;
$$;

grant execute on function public.apply_to_task(uuid, text) to authenticated;

notify pgrst, 'reload schema';
