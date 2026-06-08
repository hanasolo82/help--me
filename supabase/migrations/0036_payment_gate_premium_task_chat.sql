-- Payment gate foundation:
-- - Premium subscription state for external-payment eligibility.
-- - External payment records without duplicating the canonical payments table.
-- - Task-scoped conversations so private task chat can be gated by payment state.

create extension if not exists pgcrypto;

create table if not exists public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'stripe',
  subscription_status text not null default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_subscriptions_provider_check'
      and conrelid = 'public.user_subscriptions'::regclass
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_provider_check
      check (provider in ('stripe', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_subscriptions_status_check'
      and conrelid = 'public.user_subscriptions'::regclass
  ) then
    alter table public.user_subscriptions
      add constraint user_subscriptions_status_check
      check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'));
  end if;
end $$;

create index if not exists user_subscriptions_user_id_idx
  on public.user_subscriptions(user_id);

create index if not exists user_subscriptions_status_period_idx
  on public.user_subscriptions(subscription_status, current_period_end);

create unique index if not exists user_subscriptions_stripe_subscription_id_idx
  on public.user_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can read own subscriptions" on public.user_subscriptions;
create policy "Users can read own subscriptions"
  on public.user_subscriptions
  for select
  to authenticated
  using (user_id = (select auth.uid()));

revoke insert, update, delete on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;

alter table public.payments
  add column if not exists provider text not null default 'stripe',
  add column if not exists external_payment_confirmed_at timestamptz;

alter table public.payments
  drop constraint if exists payments_provider_check;

alter table public.payments
  add constraint payments_provider_check
  check (provider in ('stripe', 'external'));

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (
    status in (
      'draft',
      'requires_checkout',
      'processing',
      'captured',
      'held',
      'release_pending',
      'transferring',
      'released',
      'refunding',
      'refunded',
      'disputed',
      'failed',
      'voided',
      'pending',
      'requires_action',
      'succeeded',
      'external_agreed'
    )
  );

create index if not exists payments_provider_idx
  on public.payments(provider);

alter table public.conversations
  add column if not exists conversation_type text not null default 'direct',
  add column if not exists task_id uuid references public.tasks(id) on delete cascade;

alter table public.conversations
  drop constraint if exists conversations_type_check;

alter table public.conversations
  add constraint conversations_type_check
  check (conversation_type in ('direct', 'task'));

create index if not exists conversations_task_id_idx
  on public.conversations(task_id);

create unique index if not exists conversations_task_id_unique_idx
  on public.conversations(task_id)
  where task_id is not null and conversation_type = 'task';

create or replace function public.has_active_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_subscriptions us
    where us.user_id = p_user_id
      and us.subscription_status in ('active', 'trialing')
      and (us.current_period_end is null or us.current_period_end > now())
  );
$$;

grant execute on function public.has_active_premium(uuid) to authenticated;

create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conversation_row record;
  task_row record;
begin
  if me is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = me
  ) then
    return false;
  end if;

  select c.id, c.conversation_type, c.task_id
  into conversation_row
  from public.conversations c
  where c.id = p_conversation_id;

  if conversation_row.id is null then
    return false;
  end if;

  if conversation_row.task_id is null or conversation_row.conversation_type <> 'task' then
    return true;
  end if;

  select t.id, t.created_by, t.accepted_by, t.status
  into task_row
  from public.tasks t
  where t.id = conversation_row.task_id;

  if task_row.id is null then
    return false;
  end if;

  if me <> task_row.created_by and me <> task_row.accepted_by then
    return false;
  end if;

  if task_row.status in ('in_progress', 'completed', 'closed') then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_conversation(uuid) to authenticated;

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

  insert into public.conversations (created_by, conversation_type)
  values (me, 'direct')
  returning id into found_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (found_conversation_id, me),
    (found_conversation_id, other_user_id)
  on conflict (conversation_id, user_id) do nothing;

  return found_conversation_id;
end;
$$;

grant execute on function public.create_or_get_direct_conversation(uuid) to authenticated;

create or replace function public.create_or_get_task_conversation(p_task_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  task_row record;
  found_conversation_id uuid;
  lock_key bigint;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  select t.id, t.created_by, t.accepted_by, t.status
  into task_row
  from public.tasks t
  where t.id = p_task_id;

  if task_row.id is null then
    raise exception 'Task not found';
  end if;

  if task_row.accepted_by is null then
    raise exception 'Task has no assigned helper';
  end if;

  if me <> task_row.created_by and me <> task_row.accepted_by then
    raise exception 'Task conversation not accessible';
  end if;

  select hashtextextended('task:' || p_task_id::text, 0)
  into lock_key;

  perform pg_advisory_xact_lock(lock_key);

  select c.id
  into found_conversation_id
  from public.conversations c
  where c.task_id = p_task_id
    and c.conversation_type = 'task'
  limit 1;

  if found_conversation_id is not null then
    return found_conversation_id;
  end if;

  insert into public.conversations (created_by, conversation_type, task_id)
  values (me, 'task', p_task_id)
  returning id into found_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (found_conversation_id, task_row.created_by),
    (found_conversation_id, task_row.accepted_by)
  on conflict (conversation_id, user_id) do nothing;

  return found_conversation_id;
end;
$$;

grant execute on function public.create_or_get_task_conversation(uuid) to authenticated;

create or replace function public.mark_conversation_as_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_access_conversation(p_conversation_id) then
    raise exception 'Conversation not accessible';
  end if;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_participants.conversation_id = p_conversation_id
    and conversation_participants.user_id = me;
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
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if not public.can_access_conversation(p_conversation_id) then
    raise exception 'Conversation not accessible';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'Body cannot be empty';
  end if;

  if char_length(p_body) > 2000 then
    raise exception 'Body exceeds the maximum length';
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

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
  on public.conversations
  for select
  to authenticated
  using (public.can_access_conversation(id));

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
  on public.conversations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and conversation_type = 'direct'
    and task_id is null
  );

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
  on public.conversations
  for update
  to authenticated
  using (public.can_access_conversation(id))
  with check (public.can_access_conversation(id));

drop policy if exists "Participants can read conversation participants" on public.conversation_participants;
create policy "Participants can read conversation participants"
  on public.conversation_participants
  for select
  to authenticated
  using (public.can_access_conversation(conversation_id));

drop policy if exists "Authenticated users can add themselves to their own conversation" on public.conversation_participants;
create policy "Authenticated users can add themselves to their own conversation"
  on public.conversation_participants
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.conversations c
      where c.id = conversation_id
        and c.created_by = (select auth.uid())
        and c.conversation_type = 'direct'
        and c.task_id is null
    )
  );

drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can read messages"
  on public.messages
  for select
  to authenticated
  using (
    (
      conversation_id is not null
      and public.can_access_conversation(conversation_id)
    )
    or (
      chat_id is not null
      and exists (
        select 1
        from public.chats c
        where c.id = chat_id
          and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
      )
    )
  );

drop policy if exists "Participants can insert messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and coalesce(body, content) is not null
    and char_length(trim(coalesce(body, content))) > 0
    and char_length(coalesce(body, content)) <= 2000
    and (
      (
        conversation_id is not null
        and public.can_access_conversation(conversation_id)
      )
      or (
        chat_id is not null
        and exists (
          select 1
          from public.chats c
          where c.id = chat_id
            and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
        )
      )
    )
  );

drop policy if exists "Authors can update messages" on public.messages;
drop policy if exists "Participants can update own messages" on public.messages;
create policy "Authors can update messages"
  on public.messages
  for update
  to authenticated
  using (
    sender_id = (select auth.uid())
    and (
      (
        conversation_id is not null
        and public.can_access_conversation(conversation_id)
      )
      or (
        chat_id is not null
        and exists (
          select 1
          from public.chats c
          where c.id = chat_id
            and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
        )
      )
    )
  )
  with check (
    sender_id = (select auth.uid())
    and (
      (
        conversation_id is not null
        and public.can_access_conversation(conversation_id)
      )
      or (
        chat_id is not null
        and exists (
          select 1
          from public.chats c
          where c.id = chat_id
            and (c.user1_id = (select auth.uid()) or c.user2_id = (select auth.uid()))
        )
      )
    )
  );

drop policy if exists "Participants can read read receipts" on public.message_reads;
create policy "Participants can read read receipts"
  on public.message_reads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "Participants can insert own read receipts" on public.message_reads;
create policy "Participants can insert own read receipts"
  on public.message_reads
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "Participants can read attachments" on public.attachments;
create policy "Participants can read attachments"
  on public.attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "Authors can insert attachments" on public.attachments;
create policy "Authors can insert attachments"
  on public.attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "Authors can delete attachments" on public.attachments;
create policy "Authors can delete attachments"
  on public.attachments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.messages m
      where m.id = message_id
        and m.sender_id = (select auth.uid())
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "chat-attachments participant read" on storage.objects;
create policy "chat-attachments participant read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and exists (
      select 1
      from public.attachments a
      join public.messages m on m.id = a.message_id
      where a.storage_path = name
        and public.can_access_conversation(m.conversation_id)
    )
  );

drop policy if exists "chat-attachments sender upload" on storage.objects;
create policy "chat-attachments sender upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and cardinality(storage.foldername(name)) >= 3
    and exists (
      select 1
      from public.messages m
      where m.id = (storage.foldername(name))[2]::uuid
        and m.sender_id = (select auth.uid())
        and public.can_access_conversation(m.conversation_id)
        and m.conversation_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "chat-attachments sender delete" on storage.objects;
create policy "chat-attachments sender delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat-attachments'
    and cardinality(storage.foldername(name)) >= 3
    and exists (
      select 1
      from public.messages m
      where m.id = (storage.foldername(name))[2]::uuid
        and m.sender_id = (select auth.uid())
        and public.can_access_conversation(m.conversation_id)
        and m.conversation_id::text = (storage.foldername(name))[1]
    )
  );

notify pgrst, 'reload schema';
