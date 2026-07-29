-- 0061 hardened task completion but replaced the 0052 direct-request branch.
-- Restore only the invited-helper response transition while preserving the
-- browser block for in_progress -> completed.

create or replace function public.guard_authenticated_task_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    return new;
  end if;

  if old.status is not distinct from new.status
    and old.accepted_by is not distinct from new.accepted_by then
    return new;
  end if;

  -- respond_to_direct_task is SECURITY DEFINER, but auth.uid() remains the
  -- invited helper. Direct table updates are still denied by the task policy.
  if old.is_direct_request = true
    and old.status = 'open'
    and old.accepted_by is null
    and old.target_helper_id = me
    and new.created_by = old.created_by
    and new.target_helper_id is not distinct from old.target_helper_id
    and (
      (
        new.status = 'assigned'
        and new.accepted_by = me
        and new.direct_request_response = 'accepted'
      )
      or (
        new.status = 'cancelled'
        and new.accepted_by is null
        and new.direct_request_response = 'declined'
      )
    ) then
    return new;
  end if;

  if old.created_by <> me then
    raise exception 'Only the requester can change task state';
  end if;

  if old.status in ('draft', 'open')
    and old.accepted_by is null
    and new.created_by = old.created_by
    and new.accepted_by is null
    and new.status in ('draft', 'open', 'cancelled') then
    return new;
  end if;

  if old.status = 'open'
    and old.accepted_by is null
    and new.created_by = old.created_by
    and new.accepted_by is not null
    and new.accepted_by <> old.created_by
    and new.status = 'assigned' then
    return new;
  end if;

  if old.status = 'assigned'
    and old.accepted_by is not null
    and new.created_by = old.created_by
    and new.accepted_by is null
    and new.status = 'open' then
    return new;
  end if;

  if old.status in ('draft', 'open', 'assigned', 'in_progress')
    and new.created_by = old.created_by
    and new.accepted_by is not distinct from old.accepted_by
    and new.status = 'cancelled' then
    return new;
  end if;

  raise exception 'Invalid client task state transition from % to %', old.status, new.status;
end;
$$;

notify pgrst, 'reload schema';
