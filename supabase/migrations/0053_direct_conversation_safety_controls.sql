-- Direct conversations are opt-in, server-authorized and isolated from task chat.
-- Historical direct conversations remain readable. New ones require an explicit
-- helper preference, and blocks never alter task conversations or payments.

create table if not exists public.direct_message_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  accepts_direct_messages boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_profile_id),
  check (blocker_id <> blocked_profile_id)
);

create index if not exists conversations_direct_creator_recent_idx
  on public.conversations (created_by, created_at desc)
  where conversation_type = 'direct' and task_id is null;

create index if not exists user_blocks_blocked_profile_id_idx
  on public.user_blocks (blocked_profile_id);

alter table public.direct_message_preferences enable row level security;
alter table public.user_blocks enable row level security;

revoke all on public.direct_message_preferences from anon;
grant select, insert, update, delete on public.direct_message_preferences to authenticated;

revoke all on public.user_blocks from anon;
grant select, insert, update, delete on public.user_blocks to authenticated;

drop policy if exists "Users manage own direct message preference" on public.direct_message_preferences;
create policy "Users manage own direct message preference"
  on public.direct_message_preferences
  for all
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Users manage own blocks" on public.user_blocks;
create policy "Users manage own blocks"
  on public.user_blocks
  for all
  to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()));

create or replace function public.is_direct_message_blocked(
  p_user_id uuid,
  p_other_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_user_id is null
    or p_other_user_id is null
    or exists (
      select 1
      from public.user_blocks ub
      where (ub.blocker_id = p_user_id and ub.blocked_profile_id = p_other_user_id)
         or (ub.blocker_id = p_other_user_id and ub.blocked_profile_id = p_user_id)
    );
$$;

create or replace function public.can_send_to_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conversation_row record;
  direct_recipient_id uuid;
  direct_other_id uuid;
begin
  if me is null or not public.can_access_conversation(p_conversation_id) then
    return false;
  end if;

  select c.id, c.created_by, c.conversation_type, c.task_id
  into conversation_row
  from public.conversations c
  where c.id = p_conversation_id;

  if conversation_row.id is null then
    return false;
  end if;

  if conversation_row.conversation_type <> 'direct' then
    return true;
  end if;

  if conversation_row.task_id is not null
    or not exists (
      select 1
      from public.profiles p
      where p.id = me
        and p.account_status = 'active'
    )
    or (
      select count(*)
      from public.conversation_participants cp
      where cp.conversation_id = p_conversation_id
    ) <> 2 then
    return false;
  end if;

  select cp.user_id
  into direct_recipient_id
  from public.conversation_participants cp
  where cp.conversation_id = p_conversation_id
    and cp.user_id <> conversation_row.created_by;

  direct_other_id := case
    when me = conversation_row.created_by then direct_recipient_id
    else conversation_row.created_by
  end;

  if direct_recipient_id is null
    or direct_other_id is null
    or public.is_direct_message_blocked(me, direct_other_id) then
    return false;
  end if;

  -- The non-creator is the recipient chosen by create_or_get_direct_conversation.
  -- A missing preference row means a pre-existing conversation; it remains usable
  -- until its recipient explicitly disables direct messages.
  if me = conversation_row.created_by
    and exists (
      select 1
      from public.direct_message_preferences dmp
      where dmp.profile_id = direct_recipient_id
        and dmp.accepts_direct_messages = false
    ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.create_or_get_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  found_conversation_id uuid;
  lock_key bigint;
  target_profile record;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid direct conversation target';
  end if;

  select hashtextextended(
    'direct:' || least(me::text, other_user_id::text) || ':' || greatest(me::text, other_user_id::text),
    0
  )
  into lock_key;

  perform pg_advisory_xact_lock(lock_key);

  select p.id, p.account_status, p.helper_status, dmp.accepts_direct_messages
  into target_profile
  from public.profiles p
  join public.direct_message_preferences dmp on dmp.profile_id = p.id
  where p.id = other_user_id
  for share of p, dmp;

  if target_profile.id is null
    or target_profile.account_status <> 'active'
    or target_profile.helper_status <> 'active'
    or target_profile.accepts_direct_messages <> true then
    raise exception 'This helper is not accepting direct messages';
  end if;

  if public.is_direct_message_blocked(me, other_user_id) then
    raise exception 'Direct messages are not available for this profile';
  end if;

  select c.id
  into found_conversation_id
  from public.conversations c
  where c.task_id is null
    and c.conversation_type = 'direct'
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id = me
    )
    and exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id = other_user_id
    )
    and not exists (
      select 1
      from public.conversation_participants cp
      where cp.conversation_id = c.id
        and cp.user_id not in (me, other_user_id)
    )
  order by c.created_at asc
  limit 1;

  if found_conversation_id is not null then
    return found_conversation_id;
  end if;

  if (
    select count(*)
    from public.conversations c
    where c.created_by = me
      and c.conversation_type = 'direct'
      and c.task_id is null
      and c.created_at >= now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Direct conversation limit reached. Try again later';
  end if;

  insert into public.conversations (created_by, conversation_type, task_id)
  values (me, 'direct', null)
  returning id into found_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (found_conversation_id, me),
    (found_conversation_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return found_conversation_id;
end;
$$;

create or replace function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_client_temp_id text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  inserted_message public.messages;
  conversation_row record;
  consecutive_message_count integer;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_send_to_conversation(p_conversation_id) then
    raise exception 'Conversation is not available for sending';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'Body cannot be empty';
  end if;

  if char_length(p_body) > 2000 then
    raise exception 'Body exceeds the maximum length';
  end if;

  select c.id, c.conversation_type, c.task_id
  into conversation_row
  from public.conversations c
  where c.id = p_conversation_id;

  if conversation_row.conversation_type = 'direct' and conversation_row.task_id is null then
    select count(*)
    into consecutive_message_count
    from public.messages m
    where m.conversation_id = p_conversation_id
      and m.sender_id = me
      and m.created_at > coalesce(
        (
          select max(previous_message.created_at)
          from public.messages previous_message
          where previous_message.conversation_id = p_conversation_id
            and previous_message.sender_id <> me
        ),
        '-infinity'::timestamptz
      );

    if consecutive_message_count >= 1 then
      raise exception 'Wait for a reply before sending another direct message';
    end if;
  end if;

  insert into public.messages (
    conversation_id,
    sender_id,
    body,
    message_type,
    client_temp_id
  )
  values (
    p_conversation_id,
    me,
    p_body,
    'text',
    p_client_temp_id
  )
  returning * into inserted_message;

  update public.conversations
  set last_message_at = inserted_message.created_at,
      updated_at = now()
  where conversations.id = p_conversation_id;

  return inserted_message;
end;
$$;

-- Conversation creation/participants and message insertion are server-only.
-- Existing client-side edits remain scoped by the RLS policy below.
drop policy if exists "Authenticated users can create conversations" on public.conversations;
drop policy if exists "Participants can update conversations" on public.conversations;
drop policy if exists "Authenticated users can add themselves to their own conversation" on public.conversation_participants;

revoke insert, update, delete on public.conversations from public, anon, authenticated;
revoke insert, update, delete on public.conversation_participants from public, anon, authenticated;
revoke insert on public.messages from public, anon, authenticated;

drop policy if exists "Participants can insert messages" on public.messages;
create policy "Participants can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_send_to_conversation(conversation_id)
    and coalesce(body, content) is not null
    and char_length(trim(coalesce(body, content))) > 0
    and char_length(coalesce(body, content)) <= 2000
  );

drop policy if exists "Authors can update messages" on public.messages;
create policy "Authors can update messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_send_to_conversation(conversation_id)
  )
  with check (
    sender_id = (select auth.uid())
    and conversation_id is not null
    and public.can_send_to_conversation(conversation_id)
  );

revoke execute on function public.is_direct_message_blocked(uuid, uuid) from public, anon;

revoke execute on function public.can_access_conversation(uuid) from public, anon;
grant execute on function public.can_access_conversation(uuid) to authenticated;

revoke execute on function public.can_send_to_conversation(uuid) from public, anon;
grant execute on function public.can_send_to_conversation(uuid) to authenticated;

revoke execute on function public.create_or_get_direct_conversation(uuid) from public, anon;
grant execute on function public.create_or_get_direct_conversation(uuid) to authenticated;

revoke execute on function public.create_or_get_task_conversation(uuid) from public, anon;
grant execute on function public.create_or_get_task_conversation(uuid) to authenticated;

revoke execute on function public.mark_conversation_as_read(uuid) from public, anon;
grant execute on function public.mark_conversation_as_read(uuid) to authenticated;

revoke execute on function public.send_message(uuid, text, text) from public, anon;
grant execute on function public.send_message(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
