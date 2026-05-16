-- Compatibilidad entre el chat legacy por tareas y el chat privado por conversations.
-- La tabla public.messages venia del modelo legacy con chat_id/content obligatorios.
-- Para el modelo nuevo, los mensajes usan conversation_id/body.

alter table public.messages
  add column if not exists conversation_id uuid,
  add column if not exists body text,
  add column if not exists message_type text default 'text',
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists client_temp_id text;

update public.messages
set body = coalesce(body, content)
where body is null;

update public.messages
set message_type = 'text'
where message_type is null;

alter table public.messages
  alter column chat_id drop not null,
  alter column content drop not null,
  alter column message_type set not null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'messages'
      and constraint_name = 'messages_conversation_id_fkey'
  ) then
    alter table public.messages
      add constraint messages_conversation_id_fkey
      foreign key (conversation_id)
      references public.conversations(id)
      on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_body_not_empty_check'
  ) then
    alter table public.messages
      add constraint messages_body_not_empty_check
      check (body is null or char_length(trim(body)) > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'messages_body_max_length_check'
  ) then
    alter table public.messages
      add constraint messages_body_max_length_check
      check (body is null or char_length(body) <= 2000);
  end if;
end $$;

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at desc);

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
      and cp.user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_participant(uuid) to authenticated;

alter table public.messages enable row level security;

drop policy if exists "Participants can view messages" on public.messages;
drop policy if exists "Participants can send messages" on public.messages;
drop policy if exists "Participants can update own messages" on public.messages;
drop policy if exists "Participants can delete own messages" on public.messages;
drop policy if exists "Participants can read messages" on public.messages;
drop policy if exists "Participants can insert messages" on public.messages;
drop policy if exists "Authors can update messages" on public.messages;

create policy "Participants can read messages"
on public.messages
for select
to authenticated
using (
  (
    conversation_id is not null
    and public.is_conversation_participant(conversation_id)
  )
  or (
    chat_id is not null
    and exists (
      select 1
      from public.chats c
      where c.id = chat_id
        and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
    )
  )
);

create policy "Participants can insert messages"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and coalesce(body, content) is not null
  and char_length(trim(coalesce(body, content))) > 0
  and char_length(coalesce(body, content)) <= 2000
  and (
    (
      conversation_id is not null
      and public.is_conversation_participant(conversation_id)
    )
    or (
      chat_id is not null
      and exists (
        select 1
        from public.chats c
        where c.id = chat_id
          and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
      )
    )
  )
);

create policy "Authors can update messages"
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
  and (
    (
      conversation_id is not null
      and public.is_conversation_participant(conversation_id)
    )
    or (
      chat_id is not null
      and exists (
        select 1
        from public.chats c
        where c.id = chat_id
          and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
      )
    )
  )
)
with check (
  sender_id = auth.uid()
  and (
    (
      conversation_id is not null
      and public.is_conversation_participant(conversation_id)
    )
    or (
      chat_id is not null
      and exists (
        select 1
        from public.chats c
        where c.id = chat_id
          and (c.user1_id = auth.uid() or c.user2_id = auth.uid())
      )
    )
  )
);

notify pgrst, 'reload schema';
