-- Chat privado 1-to-1 para HelpMe.
-- Tablas nuevas: conversations, conversation_participants, messages, message_reads, attachments.
-- Mantiene el chat antiguo intacto para no romper historicos mientras migra el frontend.

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  created_by uuid not null references auth.users(id) on delete cascade
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_read_at timestamptz,
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  message_type text not null default 'text',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  client_temp_id text,
  constraint body_not_empty check (char_length(trim(body)) > 0),
  constraint body_max_length check (char_length(body) <= 2000)
);

create table if not exists public.message_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  storage_path text not null,
  file_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at desc);

create index if not exists conversation_participants_user_id_idx
  on public.conversation_participants (user_id);

create index if not exists conversation_participants_conversation_id_idx
  on public.conversation_participants (conversation_id);

create index if not exists conversations_last_message_at_idx
  on public.conversations (last_message_at desc);

create index if not exists message_reads_user_id_idx
  on public.message_reads (user_id);

create index if not exists attachments_message_id_idx
  on public.attachments (message_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.attachments enable row level security;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_message_sender(p_message_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = p_message_id
      and m.sender_id = (select auth.uid())
  );
$$;

drop policy if exists "Participants can read conversations" on public.conversations;
create policy "Participants can read conversations"
on public.conversations
for select
to authenticated
using (public.is_conversation_participant(id));

drop policy if exists "Authenticated users can create conversations" on public.conversations;
create policy "Authenticated users can create conversations"
on public.conversations
for insert
to authenticated
with check (created_by = (select auth.uid()));

drop policy if exists "Participants can update conversations" on public.conversations;
create policy "Participants can update conversations"
on public.conversations
for update
to authenticated
using (public.is_conversation_participant(id))
with check (public.is_conversation_participant(id));

drop policy if exists "Participants can read conversation participants" on public.conversation_participants;
create policy "Participants can read conversation participants"
on public.conversation_participants
for select
to authenticated
using (public.is_conversation_participant(conversation_id));

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
  )
);

drop policy if exists "Participants can read messages" on public.messages;
create policy "Participants can read messages"
on public.messages
for select
to authenticated
using (public.is_conversation_participant(conversation_id));

drop policy if exists "Participants can insert messages" on public.messages;
create policy "Participants can insert messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and public.is_conversation_participant(conversation_id)
);

drop policy if exists "Authors can update messages" on public.messages;
create policy "Authors can update messages"
on public.messages
for update
to authenticated
using (
  public.is_message_sender(id)
  and public.is_conversation_participant(conversation_id)
)
with check (
  public.is_message_sender(id)
  and public.is_conversation_participant(conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
  )
);

create or replace function public.create_or_get_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  conversation_id uuid;
  lock_key bigint;
begin
  if me is null then
    raise exception 'Authentication required';
  end if;

  if other_user_id is null or other_user_id = me then
    raise exception 'Invalid direct conversation target';
  end if;

  select hashtextextended(
    least(me::text, other_user_id::text) || ':' || greatest(me::text, other_user_id::text),
    0
  )
  into lock_key;

  perform pg_advisory_xact_lock(lock_key);

  select c.id
  into conversation_id
  from public.conversations c
  where exists (
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

  if conversation_id is not null then
    return conversation_id;
  end if;

  insert into public.conversations (created_by)
  values (me)
  returning id into conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values
    (conversation_id, me),
    (conversation_id, other_user_id);

  return conversation_id;
end;
$$;

create or replace function public.mark_conversation_as_read(conversation_id uuid)
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

  if not public.is_conversation_participant(conversation_id) then
    raise exception 'Conversation not accessible';
  end if;

  update public.conversation_participants
  set last_read_at = now()
  where conversation_participants.conversation_id = mark_conversation_as_read.conversation_id
    and conversation_participants.user_id = me;
end;
$$;

create or replace function public.send_message(
  conversation_id uuid,
  body text,
  client_temp_id text default null
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

  if not public.is_conversation_participant(conversation_id) then
    raise exception 'Conversation not accessible';
  end if;

  if body is null or char_length(trim(body)) = 0 then
    raise exception 'Body cannot be empty';
  end if;

  if char_length(body) > 2000 then
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
    send_message.conversation_id,
    me,
    body,
    'text',
    client_temp_id
  )
  returning * into inserted_message;

  update public.conversations
  set last_message_at = inserted_message.created_at,
      updated_at = now()
  where id = conversation_id;

  return inserted_message;
end;
$$;

create or replace function public.touch_conversations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at
before update on public.conversations
for each row execute function public.touch_conversations_updated_at();

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', false)
on conflict (id) do nothing;

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
      and public.is_conversation_participant(m.conversation_id)
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
      and public.is_conversation_participant(m.conversation_id)
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
  and exists (
    select 1
    from public.messages m
    where m.id = (storage.foldername(name))[2]::uuid
      and m.sender_id = (select auth.uid())
      and public.is_conversation_participant(m.conversation_id)
      and m.conversation_id::text = (storage.foldername(name))[1]
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_publication pub
    join pg_publication_rel rel on rel.prpubid = pub.oid
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.conversations';
  end if;

  if not exists (
    select 1
    from pg_publication pub
    join pg_publication_rel rel on rel.prpubid = pub.oid
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'conversation_participants'
  ) then
    execute 'alter publication supabase_realtime add table public.conversation_participants';
  end if;

  if not exists (
    select 1
    from pg_publication pub
    join pg_publication_rel rel on rel.prpubid = pub.oid
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'messages'
  ) then
    execute 'alter publication supabase_realtime add table public.messages';
  end if;

  if not exists (
    select 1
    from pg_publication pub
    join pg_publication_rel rel on rel.prpubid = pub.oid
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'message_reads'
  ) then
    execute 'alter publication supabase_realtime add table public.message_reads';
  end if;
end;
$$;
