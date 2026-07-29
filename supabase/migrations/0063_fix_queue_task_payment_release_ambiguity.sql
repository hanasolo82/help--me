-- Fix: queue_task_payment_release() raised 42702 "column reference payment_id is
-- ambiguous" on every call, so no task could be completed and no release job was ever
-- created (payment_release_jobs stayed empty since 0061 shipped).
--
-- Cause: `payment_id` is declared as an OUT column in `returns table (...)`, which puts
-- it in scope as a variable inside the body. The two lookups on payment_release_jobs
-- referenced the column unqualified, so plpgsql could not tell them apart and, with the
-- default variable_conflict = error, aborted the whole function.
--
-- Only the two lookups change: they now use an explicit table alias. Behaviour is
-- otherwise identical to 0061.

create or replace function public.queue_task_payment_release(
  p_task_id uuid,
  p_requester_id uuid
)
returns table (
  job_id uuid,
  payment_id uuid,
  task_status text,
  payment_status text,
  job_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.tasks%rowtype;
  payment_row public.payments%rowtype;
  job_row public.payment_release_jobs%rowtype;
  now_at timestamptz := now();
begin
  select * into task_row
  from public.tasks
  where id = p_task_id
  for update;

  if not found then
    raise exception 'Task not found' using errcode = 'P0002';
  end if;

  if task_row.created_by <> p_requester_id then
    raise exception 'Only the requester can complete this task' using errcode = '42501';
  end if;

  if task_row.accepted_by is null then
    raise exception 'Task has no accepted helper' using errcode = 'P0001';
  end if;

  select * into payment_row
  from public.payments
  where task_id = task_row.id
  for update;

  if not found then
    raise exception 'Task has no payment to release' using errcode = 'P0002';
  end if;

  if payment_row.requester_profile_id <> task_row.created_by
    or payment_row.helper_profile_id <> task_row.accepted_by then
    raise exception 'Payment participants do not match the task' using errcode = 'P0001';
  end if;

  if task_row.status = 'closed' then
    if payment_row.status <> 'released' then
      raise exception 'Closed task has no released payment' using errcode = 'P0001';
    end if;

    select prj.* into job_row
    from public.payment_release_jobs prj
    where prj.payment_id = payment_row.id;

    return query select job_row.id, payment_row.id, task_row.status, payment_row.status,
      coalesce(job_row.status, 'succeeded');
    return;
  end if;

  if task_row.status not in ('in_progress', 'completed') then
    raise exception 'Task must be in progress or completed before release' using errcode = 'P0001';
  end if;

  if payment_row.provider = 'external' or payment_row.status = 'external_agreed' then
    update public.tasks
    set status = 'completed',
        completed_at = coalesce(completed_at, now_at),
        updated_at = now_at,
        modified_at = now_at
    where id = task_row.id
      and status in ('in_progress', 'completed');

    return query select null::uuid, payment_row.id, 'completed'::text, payment_row.status, 'external'::text;
    return;
  end if;

  if payment_row.status = 'released' then
    raise exception 'Released payment is not paired with a closed task' using errcode = 'P0001';
  end if;

  if payment_row.status not in ('held', 'release_pending', 'transferring') then
    raise exception 'Payment must be held before release' using errcode = 'P0001';
  end if;

  select prj.* into job_row
  from public.payment_release_jobs prj
  where prj.payment_id = payment_row.id
  for update;

  update public.tasks
  set status = 'completed',
      completed_at = coalesce(completed_at, now_at),
      updated_at = now_at,
      modified_at = now_at
  where id = task_row.id
    and status in ('in_progress', 'completed');

  if job_row.id is null then
    update public.payments
    set status = 'release_pending',
        reconciliation_status = 'pending',
        reconciliation_error = null,
        updated_at = now_at
    where id = payment_row.id;

    insert into public.payment_release_jobs (
      payment_id,
      task_id,
      requested_by,
      status,
      next_attempt_at
    ) values (
      payment_row.id,
      task_row.id,
      p_requester_id,
      'queued',
      now_at
    )
    returning * into job_row;
  end if;

  select * into payment_row
  from public.payments
  where id = payment_row.id;

  return query select job_row.id, payment_row.id, 'completed'::text, payment_row.status, job_row.status;
end;
$$;

revoke all on function public.queue_task_payment_release(uuid, uuid) from public, anon, authenticated;
grant execute on function public.queue_task_payment_release(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
