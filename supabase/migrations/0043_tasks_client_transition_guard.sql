-- RLS update policies are permissive and OR-composed. Add a transition guard so
-- client-side task updates cannot combine the USING clause of one policy with the
-- WITH CHECK clause of another to jump across the payment/release state machine.

create or replace function public.guard_authenticated_task_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  -- Backend/service-role and internal maintenance paths do not carry an auth.uid().
  -- They remain governed by server code and webhook state-machine checks.
  if me is null then
    return new;
  end if;

  if old.status is not distinct from new.status
    and old.accepted_by is not distinct from new.accepted_by then
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

  if old.status in ('in_progress', 'completed')
    and old.accepted_by is not null
    and new.created_by = old.created_by
    and new.accepted_by is not distinct from old.accepted_by
    and new.status = 'completed' then
    return new;
  end if;

  raise exception 'Invalid client task state transition from % to %', old.status, new.status;
end;
$$;

drop trigger if exists tasks_guard_authenticated_status_transition on public.tasks;
create trigger tasks_guard_authenticated_status_transition
before update of status, accepted_by on public.tasks
for each row execute function public.guard_authenticated_task_status_transition();

notify pgrst, 'reload schema';
