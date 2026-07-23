-- Chat lifecycle phase 3: service-only operations for manual retention holds.
-- This migration records decisions; it does not schedule or perform any purge.

create table if not exists public.conversation_retention_hold_events (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references public.conversation_retention_holds(id) on delete cascade,
  event_type text not null check (event_type in ('hold_created', 'hold_released')),
  operator_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversation_retention_hold_events_hold_created_idx
  on public.conversation_retention_hold_events (hold_id, created_at);

alter table public.conversation_retention_hold_events enable row level security;

-- Only the audited functions below may mutate holds or their event history.
revoke all on table public.conversation_retention_holds from public, anon, authenticated, service_role;
grant select on table public.conversation_retention_holds to service_role;

revoke all on table public.conversation_retention_hold_events from public, anon, authenticated, service_role;
grant select on table public.conversation_retention_hold_events to service_role;

create or replace function public.create_task_chat_retention_hold(
  p_conversation_id uuid,
  p_hold_type text,
  p_source_reference text default null,
  p_expires_at timestamptz default null,
  p_operator_reference text default null
)
returns public.conversation_retention_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  created_hold public.conversation_retention_holds%rowtype;
  normalized_source_reference text := nullif(btrim(p_source_reference), '');
  normalized_operator_reference text := nullif(btrim(p_operator_reference), '');
begin
  if p_conversation_id is null
    or p_hold_type not in ('support_review', 'legal_request', 'safety_review') then
    raise exception 'Invalid retention hold request';
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Retention hold expiry must be in the future';
  end if;

  -- Serialize an identical active request so duplicate support actions cannot
  -- create parallel holds during concurrent service calls.
  perform pg_advisory_xact_lock(
    hashtextextended(
      p_conversation_id::text || ':' || p_hold_type || ':' || coalesce(normalized_source_reference, ''),
      0
    )
  );

  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.conversation_type = 'task'
      and c.task_id is not null
      and c.retention_started_at is not null
  ) then
    raise exception 'Retention holds require a terminal task conversation';
  end if;

  if exists (
    select 1
    from public.conversation_retention_holds h
    where h.conversation_id = p_conversation_id
      and h.hold_type = p_hold_type
      and h.source_reference is not distinct from normalized_source_reference
      and h.released_at is null
      and (h.expires_at is null or h.expires_at > now())
  ) then
    raise exception 'An equivalent active retention hold already exists';
  end if;

  insert into public.conversation_retention_holds (
    conversation_id,
    hold_type,
    source_reference,
    expires_at
  )
  values (
    p_conversation_id,
    p_hold_type,
    normalized_source_reference,
    p_expires_at
  )
  returning * into created_hold;

  insert into public.conversation_retention_hold_events (
    hold_id,
    event_type,
    operator_reference,
    metadata
  )
  values (
    created_hold.id,
    'hold_created',
    normalized_operator_reference,
    jsonb_strip_nulls(jsonb_build_object(
      'hold_type', created_hold.hold_type,
      'source_reference', created_hold.source_reference,
      'expires_at', created_hold.expires_at
    ))
  );

  return created_hold;
end;
$$;

create or replace function public.release_task_chat_retention_hold(
  p_hold_id uuid,
  p_release_reference text default null,
  p_operator_reference text default null
)
returns public.conversation_retention_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  released_hold public.conversation_retention_holds%rowtype;
  normalized_release_reference text := nullif(btrim(p_release_reference), '');
  normalized_operator_reference text := nullif(btrim(p_operator_reference), '');
begin
  if p_hold_id is null then
    raise exception 'Retention hold id is required';
  end if;

  select h.*
  into released_hold
  from public.conversation_retention_holds h
  where h.id = p_hold_id
  for update;

  if released_hold.id is null then
    raise exception 'Retention hold not found';
  end if;

  if released_hold.released_at is not null then
    raise exception 'Retention hold is already released';
  end if;

  update public.conversation_retention_holds h
  set released_at = now()
  where h.id = released_hold.id
  returning * into released_hold;

  insert into public.conversation_retention_hold_events (
    hold_id,
    event_type,
    operator_reference,
    metadata
  )
  values (
    released_hold.id,
    'hold_released',
    normalized_operator_reference,
    jsonb_strip_nulls(jsonb_build_object(
      'release_reference', normalized_release_reference,
      'hold_type', released_hold.hold_type,
      'source_reference', released_hold.source_reference
    ))
  );

  return released_hold;
end;
$$;

create or replace function public.get_task_chat_retention_hold_history(
  p_conversation_id uuid
)
returns table (
  hold_id uuid,
  hold_type text,
  source_reference text,
  starts_at timestamptz,
  expires_at timestamptz,
  released_at timestamptz,
  event_type text,
  event_operator_reference text,
  event_metadata jsonb,
  event_created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.conversation_type = 'task'
      and c.task_id is not null
  ) then
    raise exception 'Retention history requires a task conversation';
  end if;

  return query
  select
    h.id,
    h.hold_type,
    h.source_reference,
    h.starts_at,
    h.expires_at,
    h.released_at,
    e.event_type,
    e.operator_reference,
    e.metadata,
    e.created_at
  from public.conversation_retention_holds h
  join public.conversation_retention_hold_events e on e.hold_id = h.id
  where h.conversation_id = p_conversation_id
  order by e.created_at asc, e.id asc;
end;
$$;

revoke execute on function public.create_task_chat_retention_hold(uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.release_task_chat_retention_hold(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.get_task_chat_retention_hold_history(uuid) from public, anon, authenticated;

grant execute on function public.create_task_chat_retention_hold(uuid, text, text, timestamptz, text) to service_role;
grant execute on function public.release_task_chat_retention_hold(uuid, text, text) to service_role;
grant execute on function public.get_task_chat_retention_hold_history(uuid) to service_role;

notify pgrst, 'reload schema';
