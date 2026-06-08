-- Safe requester decision flow:
-- Allows the task owner to reject an assigned helper before payment.
-- The task returns to open, pending local payment records are voided, and the
-- task-scoped conversation is removed so a future helper can create a fresh one.

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

notify pgrst, 'reload schema';
