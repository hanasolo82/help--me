-- Chat lifecycle phase 4: keep task-chat messages and attachments for five
-- calendar years. This migration only changes retention metadata; it does not
-- schedule jobs, export content, or delete database/Storage records.

alter table public.conversations
  drop constraint if exists conversations_task_retention_schedule_check;

-- Recalculate schedules created by 0058 so the new policy also covers existing
-- terminal task chats.
update public.conversations
set attachments_purge_after = retention_started_at + interval '5 years',
    messages_purge_after = retention_started_at + interval '5 years'
where conversation_type = 'task'
  and retention_started_at is not null;

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
          and attachments_purge_after = retention_started_at + interval '5 years'
          and messages_purge_after = retention_started_at + interval '5 years'
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
      attachments_purge_after = retention_start + interval '5 years',
      messages_purge_after = retention_start + interval '5 years'
  where c.task_id = new.id
    and c.conversation_type = 'task'
    and c.retention_started_at is null
    and c.attachments_purge_after is null
    and c.messages_purge_after is null;

  return new;
end;
$$;

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
      attachments_purge_after = retention_start + interval '5 years',
      messages_purge_after = retention_start + interval '5 years'
  where c.id = new.id
    and c.retention_started_at is null
    and c.attachments_purge_after is null
    and c.messages_purge_after is null;

  return new;
end;
$$;

notify pgrst, 'reload schema';
