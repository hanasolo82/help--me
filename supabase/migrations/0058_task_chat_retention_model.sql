-- Chat lifecycle phase 2: retain task-chat metadata and expose a service-only
-- preview. This migration intentionally schedules nothing and deletes nothing.

alter table public.conversations
  add column if not exists retention_started_at timestamptz,
  add column if not exists attachments_purge_after timestamptz,
  add column if not exists messages_purge_after timestamptz;

-- The schedule belongs solely to task conversations. When present, the locked
-- intervals make retention dates immutable unless an internal migration changes
-- the retention policy deliberately.
alter table public.conversations
  drop constraint if exists conversations_task_retention_schedule_check;

alter table public.conversations
  add constraint conversations_task_retention_schedule_check
  check (
    (
      conversation_type = 'task'
      and (
        (
          retention_started_at is null
          and attachments_purge_after is null
          and messages_purge_after is null
        )
        or (
          retention_started_at is not null
          and attachments_purge_after = retention_started_at + interval '180 days'
          and messages_purge_after = retention_started_at + interval '365 days'
          and retention_started_at <= attachments_purge_after
          and attachments_purge_after <= messages_purge_after
        )
      )
    )
    or (
      conversation_type = 'direct'
      and retention_started_at is null
      and attachments_purge_after is null
      and messages_purge_after is null
    )
  );

create or replace function public.initialize_task_chat_retention_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  retention_start timestamptz;
begin
  if new.status not in ('completed', 'closed', 'cancelled') then
    return new;
  end if;

  retention_start := case
    when new.status in ('completed', 'closed') then coalesce(new.completed_at, new.updated_at, new.created_at)
    when new.status = 'cancelled' then coalesce(new.cancelled_at, new.updated_at, new.created_at)
  end;

  update public.conversations c
  set retention_started_at = retention_start,
      attachments_purge_after = retention_start + interval '180 days',
      messages_purge_after = retention_start + interval '365 days'
  where c.task_id = new.id
    and c.conversation_type = 'task'
    and c.retention_started_at is null
    and c.attachments_purge_after is null
    and c.messages_purge_after is null;

  return new;
end;
$$;

drop trigger if exists tasks_initialize_task_chat_retention on public.tasks;
create trigger tasks_initialize_task_chat_retention
after insert or update of status, completed_at, cancelled_at on public.tasks
for each row execute function public.initialize_task_chat_retention_from_task();

create or replace function public.initialize_task_chat_retention_from_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row record;
  retention_start timestamptz;
begin
  if new.conversation_type <> 'task'
    or new.task_id is null
    or new.retention_started_at is not null
    or new.attachments_purge_after is not null
    or new.messages_purge_after is not null then
    return new;
  end if;

  select t.status, t.completed_at, t.cancelled_at, t.updated_at, t.created_at
  into task_row
  from public.tasks t
  where t.id = new.task_id;

  if task_row.status not in ('completed', 'closed', 'cancelled') then
    return new;
  end if;

  retention_start := case
    when task_row.status in ('completed', 'closed') then coalesce(task_row.completed_at, task_row.updated_at, task_row.created_at)
    when task_row.status = 'cancelled' then coalesce(task_row.cancelled_at, task_row.updated_at, task_row.created_at)
  end;

  update public.conversations c
  set retention_started_at = retention_start,
      attachments_purge_after = retention_start + interval '180 days',
      messages_purge_after = retention_start + interval '365 days'
  where c.id = new.id
    and c.retention_started_at is null
    and c.attachments_purge_after is null
    and c.messages_purge_after is null;

  return new;
end;
$$;

drop trigger if exists conversations_initialize_task_chat_retention on public.conversations;
create trigger conversations_initialize_task_chat_retention
after insert or update of task_id, conversation_type on public.conversations
for each row execute function public.initialize_task_chat_retention_from_conversation();

-- Historical terminal task chats get the same immutable schedule. completed_at
-- wins for completed/closed tasks so a later closed transition never shifts it.
update public.conversations c
set retention_started_at = case
      when t.status in ('completed', 'closed') then coalesce(t.completed_at, t.updated_at, t.created_at)
      when t.status = 'cancelled' then coalesce(t.cancelled_at, t.updated_at, t.created_at)
    end,
    attachments_purge_after = case
      when t.status in ('completed', 'closed') then coalesce(t.completed_at, t.updated_at, t.created_at) + interval '180 days'
      when t.status = 'cancelled' then coalesce(t.cancelled_at, t.updated_at, t.created_at) + interval '180 days'
    end,
    messages_purge_after = case
      when t.status in ('completed', 'closed') then coalesce(t.completed_at, t.updated_at, t.created_at) + interval '365 days'
      when t.status = 'cancelled' then coalesce(t.cancelled_at, t.updated_at, t.created_at) + interval '365 days'
    end
from public.tasks t
where c.task_id = t.id
  and c.conversation_type = 'task'
  and t.status in ('completed', 'closed', 'cancelled')
  and c.retention_started_at is null
  and c.attachments_purge_after is null
  and c.messages_purge_after is null;

create table if not exists public.conversation_retention_holds (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  hold_type text not null,
  source_reference text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_retention_holds_type_check
    check (hold_type in ('support_review', 'legal_request', 'safety_review')),
  constraint conversation_retention_holds_expiry_check
    check (expires_at is null or expires_at > starts_at),
  constraint conversation_retention_holds_release_check
    check (released_at is null or released_at >= starts_at)
);

create or replace function public.touch_conversation_retention_holds_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversation_retention_holds_touch_updated_at on public.conversation_retention_holds;
create trigger conversation_retention_holds_touch_updated_at
before update on public.conversation_retention_holds
for each row execute function public.touch_conversation_retention_holds_updated_at();

alter table public.conversation_retention_holds enable row level security;

revoke all on table public.conversation_retention_holds from public, anon, authenticated;
grant select, insert, update, delete on table public.conversation_retention_holds to service_role;

create index if not exists conversations_task_attachments_purge_after_idx
  on public.conversations (attachments_purge_after)
  where conversation_type = 'task' and attachments_purge_after is not null;

create index if not exists conversations_task_messages_purge_after_idx
  on public.conversations (messages_purge_after)
  where conversation_type = 'task' and messages_purge_after is not null;

create index if not exists conversation_retention_holds_active_conversation_idx
  on public.conversation_retention_holds (conversation_id)
  where released_at is null;

create or replace function public.preview_task_chat_retention(
  p_as_of timestamptz default now(),
  p_limit integer default 500
)
returns table (
  conversation_id uuid,
  task_id uuid,
  task_status text,
  retention_started_at timestamptz,
  attachments_purge_after timestamptz,
  messages_purge_after timestamptz,
  attachment_count bigint,
  attachment_bytes bigint,
  message_count bigint,
  has_active_manual_hold boolean,
  has_active_dispute boolean,
  attachments_due boolean,
  messages_due boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with input as (
    select
      coalesce(p_as_of, now()) as as_of,
      greatest(1, least(coalesce(p_limit, 500), 1000)) as row_limit
  ), terminal_task_chats as (
    select
      c.id as conversation_id,
      c.task_id,
      t.status as task_status,
      c.retention_started_at,
      c.attachments_purge_after,
      c.messages_purge_after,
      input.as_of
    from public.conversations c
    join public.tasks t on t.id = c.task_id
    cross join input
    where c.conversation_type = 'task'
      and c.task_id is not null
      and t.status in ('completed', 'closed', 'cancelled')
      and c.retention_started_at is not null
      and c.attachments_purge_after is not null
      and c.messages_purge_after is not null
  ), summarized as (
    select
      tc.*,
      (
        select count(*)::bigint
        from public.messages m
        where m.conversation_id = tc.conversation_id
      ) as message_count,
      (
        select count(a.id)::bigint
        from public.messages m
        join public.attachments a on a.message_id = m.id
        where m.conversation_id = tc.conversation_id
      ) as attachment_count,
      (
        select coalesce(sum(a.size_bytes), 0)::bigint
        from public.messages m
        join public.attachments a on a.message_id = m.id
        where m.conversation_id = tc.conversation_id
      ) as attachment_bytes,
      exists (
        select 1
        from public.conversation_retention_holds h
        where h.conversation_id = tc.conversation_id
          and h.released_at is null
          and h.starts_at <= tc.as_of
          and (h.expires_at is null or h.expires_at > tc.as_of)
      ) as has_active_manual_hold,
      exists (
        select 1
        from public.payments p
        join public.disputes d on d.payment_id = p.id
        where p.task_id = tc.task_id
          and d.status in ('opened', 'needs_response', 'under_review')
      ) as has_active_dispute
    from terminal_task_chats tc
  )
  select
    conversation_id,
    task_id,
    task_status,
    retention_started_at,
    attachments_purge_after,
    messages_purge_after,
    attachment_count,
    attachment_bytes,
    message_count,
    has_active_manual_hold,
    has_active_dispute,
    attachments_purge_after <= as_of
      and not has_active_manual_hold
      and not has_active_dispute as attachments_due,
    messages_purge_after <= as_of
      and not has_active_manual_hold
      and not has_active_dispute as messages_due
  from summarized
  order by attachments_purge_after asc, conversation_id asc
  limit (select row_limit from input);
$$;

revoke execute on function public.preview_task_chat_retention(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.preview_task_chat_retention(timestamptz, integer) to service_role;

notify pgrst, 'reload schema';
