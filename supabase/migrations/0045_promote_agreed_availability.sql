-- Promote the selected helper's proposed availability to the task only when the
-- requester explicitly selects an alternative proposal.

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

grant execute on function public.select_task_helper(uuid) to authenticated;

revoke execute on function public.apply_to_task(uuid, text, text, date, text, text) from public;
revoke execute on function public.apply_to_task(uuid, text, text, date, text, text) from anon;
grant execute on function public.apply_to_task(uuid, text, text, date, text, text) to authenticated;

notify pgrst, 'reload schema';
